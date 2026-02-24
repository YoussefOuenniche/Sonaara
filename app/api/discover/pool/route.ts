import { NextRequest, NextResponse } from "next/server";
import { getSession, getAccessToken } from "@/lib/session";
import { getUser, getUsers, getFriendIds, setLikedTracks } from "@/lib/store";
import { getLikedTracks } from "@/lib/spotify";
import { getUmbrellaKeywords } from "@/lib/genres";
import type { DiscoverTrack } from "@/types";

export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session.userId) return NextResponse.json({ tracks: [] });

  const accessToken = await getAccessToken();
  if (!accessToken) return NextResponse.json({ tracks: [] });

  const genre = request.nextUrl.searchParams.get("genre") ?? "";

  const currentUser = await getUser(session.userId);
  const mySkipped = new Set(currentUser?.skippedTrackIds ?? []);

  // Resolve current user's liked tracks — fetch from Spotify if cache is cold
  let myLikedTracks = currentUser?.likedTracks ?? [];
  if (myLikedTracks.length === 0) {
    myLikedTracks = await getLikedTracks(accessToken).catch(() => []);
    if (myLikedTracks.length > 0 && currentUser) {
      await setLikedTracks(session.userId, myLikedTracks).catch(() => {});
    }
  } else if (myLikedTracks[0].previewUrl === undefined) {
    // Cache predates previewUrl field — refresh in background so new likes are excluded next time
    getLikedTracks(accessToken)
      .then((fresh) => { if (fresh.length > 0) setLikedTracks(session.userId!, fresh).catch(() => {}); })
      .catch(() => {});
  }

  const myLikedIds = new Set(myLikedTracks.map((t) => t.id));

  // Name map for resolving display names
  const nameMap = new Map<string, string>();
  nameMap.set(session.userId, currentUser?.userName ?? "you");

  const friendIds = await getFriendIds(session.userId);
  const friends = friendIds.length ? await getUsers(friendIds) : [];
  for (const f of friends) nameMap.set(f.userId, f.userName);

  // Build pool from friends' liked tracks
  const poolMap = new Map<string, DiscoverTrack>();

  for (const friend of friends) {
    for (const track of friend.likedTracks ?? []) {
      if (myLikedIds.has(track.id)) continue;
      if (mySkipped.has(track.id)) continue;

      if (poolMap.has(track.id)) {
        const existing = poolMap.get(track.id)!;
        existing.likedByUserIds.push(friend.userId);
        existing.likedByNames.push(nameMap.get(friend.userId) ?? "a friend");
      } else {
        poolMap.set(track.id, {
          ...track,
          likedByUserIds: [friend.userId],
          likedByNames: [nameMap.get(friend.userId) ?? "a friend"],
        });
      }
    }
  }

  let pool = Array.from(poolMap.values());

  // Fallback: seed with the current user's own liked tracks
  if (pool.length === 0 && myLikedTracks.length > 0) {
    const myName = currentUser?.userName ?? "you";
    pool = myLikedTracks
      .filter((t) => !mySkipped.has(t.id))
      .map((track) => ({
        ...track,
        likedByUserIds: [session.userId!],
        likedByNames: [myName],
      }));
  }

  // Filter by umbrella genre — expand to all matching micro-genre keywords
  if (genre && genre !== "anything") {
    const keywords = getUmbrellaKeywords(genre.toLowerCase());
    pool = pool.filter((t) =>
      t.genres.some((tg) => {
        const tgl = tg.toLowerCase();
        return keywords.some((kw) => tgl.includes(kw));
      })
    );
  }

  // Split pool: community tracks (liked by 2+ friends) vs single-friend tracks
  const communityPool = pool.filter((t) => t.likedByUserIds.length >= 2);
  const singlePool = pool.filter((t) => t.likedByUserIds.length < 2);

  // Round-robin interleave singles by primary friend for even distribution
  const buckets = new Map<string, DiscoverTrack[]>();
  for (const track of singlePool) {
    const key = track.likedByUserIds[0] ?? "fallback";
    if (!buckets.has(key)) buckets.set(key, []);
    buckets.get(key)!.push(track);
  }
  // Shuffle each friend's bucket independently
  for (const bucket of buckets.values()) {
    for (let k = bucket.length - 1; k > 0; k--) {
      const r = Math.floor(Math.random() * (k + 1));
      [bucket[k], bucket[r]] = [bucket[r], bucket[k]];
    }
  }
  // Randomise which friend goes first
  const queues = Array.from(buckets.values());
  for (let k = queues.length - 1; k > 0; k--) {
    const r = Math.floor(Math.random() * (k + 1));
    [queues[k], queues[r]] = [queues[r], queues[k]];
  }
  // Interleave singles: A1, B1, C1, A2, B2, C2, …
  const interleavedSingles: DiscoverTrack[] = [];
  const ptrs = new Array(queues.length).fill(0);
  let hasMore = true;
  while (hasMore) {
    hasMore = false;
    for (let i = 0; i < queues.length; i++) {
      if (ptrs[i] < queues[i].length) {
        interleavedSingles.push(queues[i][ptrs[i]++]);
        hasMore = true;
      }
    }
  }

  // Shuffle community tracks
  for (let k = communityPool.length - 1; k > 0; k--) {
    const r = Math.floor(Math.random() * (k + 1));
    [communityPool[k], communityPool[r]] = [communityPool[r], communityPool[k]];
  }

  // If no community tracks (only 1 friend or none liked by multiple), skip injection
  if (communityPool.length === 0) {
    pool = interleavedSingles;
  } else {
    // Inject 1 community track every 4th position: 3 singles → 1 community → repeat
    pool = [];
    let si = 0;
    let ci = 0;
    while (si < interleavedSingles.length || ci < communityPool.length) {
      for (let j = 0; j < 3 && si < interleavedSingles.length; j++, si++) {
        pool.push(interleavedSingles[si]);
      }
      if (ci < communityPool.length) {
        pool.push(communityPool[ci++]);
      }
    }
  }

  return NextResponse.json({ tracks: pool, friendCount: friends.length });
}
