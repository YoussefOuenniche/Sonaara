import { NextResponse } from "next/server";
import { getSession, getAccessToken } from "@/lib/session";
import { getUser, getUsers, getFriendIds, setLikedTracks } from "@/lib/store";
import { getLikedTracks } from "@/lib/spotify";

export async function GET() {
  const session = await getSession();
  if (!session.userId) return NextResponse.json({ available: [] });

  const accessToken = await getAccessToken();
  if (!accessToken) return NextResponse.json({ available: [] });

  const currentUser = await getUser(session.userId);

  // Resolve current user's liked tracks — fetch from Spotify if cache is cold
  let myLikedTracks = currentUser?.likedTracks ?? [];
  if (myLikedTracks.length === 0) {
    myLikedTracks = await getLikedTracks(accessToken).catch(() => []);
    if (myLikedTracks.length > 0 && currentUser) {
      await setLikedTracks(session.userId, myLikedTracks).catch(() => {});
    }
  }

  const mySkipped = new Set(currentUser?.skippedTrackIds ?? []);
  const myLikedIds = new Set(myLikedTracks.map((t) => t.id));

  const friendIds = await getFriendIds(session.userId);
  const friends = friendIds.length ? await getUsers(friendIds) : [];

  // Count genre frequency across friends' pool tracks (excluding already-liked/skipped)
  const genreFreq = new Map<string, number>();

  for (const friend of friends) {
    for (const track of friend.likedTracks ?? []) {
      if (myLikedIds.has(track.id)) continue;
      if (mySkipped.has(track.id)) continue;
      for (const g of track.genres ?? []) {
        const key = g.toLowerCase().trim();
        if (key) genreFreq.set(key, (genreFreq.get(key) ?? 0) + 1);
      }
    }
  }

  // Fallback: if no friends, use own tracks
  if (genreFreq.size === 0) {
    for (const track of myLikedTracks) {
      if (mySkipped.has(track.id)) continue;
      for (const g of track.genres ?? []) {
        const key = g.toLowerCase().trim();
        if (key) genreFreq.set(key, (genreFreq.get(key) ?? 0) + 1);
      }
    }
  }

  // Sort by frequency descending, then alphabetically
  const available = Array.from(genreFreq.entries())
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .map(([g]) => g);

  return NextResponse.json({ available });
}
