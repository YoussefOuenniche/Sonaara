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
      // Warm the cache so future calls are fast
      await setLikedTracks(session.userId, myLikedTracks).catch(() => {});
    }
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

  // Full random shuffle — gives an even mix of songs from all friends
  for (let k = pool.length - 1; k > 0; k--) {
    const r = Math.floor(Math.random() * (k + 1));
    [pool[k], pool[r]] = [pool[r], pool[k]];
  }

  return NextResponse.json({ tracks: pool, friendCount: friends.length });
}
