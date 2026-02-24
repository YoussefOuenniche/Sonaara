import { NextRequest, NextResponse } from "next/server";
import { getSession, getAccessToken } from "@/lib/session";
import { getUser, getUsers, getFriendIds, setLikedTracks } from "@/lib/store";
import { getLikedTracks, getTrackPreviews } from "@/lib/spotify";
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

  // Round-robin interleave by primary friend for even distribution
  // Group tracks by the first friend who liked them
  const buckets = new Map<string, DiscoverTrack[]>();
  for (const track of pool) {
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
  // Randomise which friend goes first (different order each load)
  const queues = Array.from(buckets.values());
  for (let k = queues.length - 1; k > 0; k--) {
    const r = Math.floor(Math.random() * (k + 1));
    [queues[k], queues[r]] = [queues[r], queues[k]];
  }
  // Interleave: A1, B1, C1, A2, B2, C2, …
  pool = [];
  const ptrs = new Array(queues.length).fill(0);
  let hasMore = true;
  while (hasMore) {
    hasMore = false;
    for (let i = 0; i < queues.length; i++) {
      if (ptrs[i] < queues[i].length) {
        pool.push(queues[i][ptrs[i]++]);
        hasMore = true;
      }
    }
  }

  // Patch any tracks missing previewUrl (stale cache) — all chunks fetched in parallel
  const missingPreviewIds = pool.filter((t) => t.previewUrl === undefined).map((t) => t.id);
  if (missingPreviewIds.length > 0) {
    const previews = await getTrackPreviews(missingPreviewIds, accessToken).catch(() => new Map<string, string | null>());
    if (previews.size > 0) {
      pool = pool.map((t) =>
        t.previewUrl === undefined && previews.has(t.id)
          ? { ...t, previewUrl: previews.get(t.id) ?? null }
          : t
      );
    }
  }

  return NextResponse.json({ tracks: pool, friendCount: friends.length });
}
