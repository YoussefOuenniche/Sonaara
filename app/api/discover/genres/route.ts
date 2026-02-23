import { NextResponse } from "next/server";
import { getSession, getAccessToken } from "@/lib/session";
import { getUser, getUsers, getFriendIds, setLikedTracks } from "@/lib/store";
import { getLikedTracks } from "@/lib/spotify";
import { mapToUmbrellas } from "@/lib/genres";

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

  // Count umbrella genre frequency across the pool (friends' tracks minus already-liked/skipped)
  const umbrellaFreq = new Map<string, number>();

  for (const friend of friends) {
    for (const track of friend.likedTracks ?? []) {
      if (myLikedIds.has(track.id)) continue;
      if (mySkipped.has(track.id)) continue;
      const seen = new Set<string>();
      for (const g of track.genres ?? []) {
        for (const umbrella of mapToUmbrellas(g)) {
          if (!seen.has(umbrella)) {
            seen.add(umbrella);
            umbrellaFreq.set(umbrella, (umbrellaFreq.get(umbrella) ?? 0) + 1);
          }
        }
      }
    }
  }

  // Fallback: use own tracks if no friends
  if (umbrellaFreq.size === 0) {
    for (const track of myLikedTracks) {
      if (mySkipped.has(track.id)) continue;
      const seen = new Set<string>();
      for (const g of track.genres ?? []) {
        for (const umbrella of mapToUmbrellas(g)) {
          if (!seen.has(umbrella)) {
            seen.add(umbrella);
            umbrellaFreq.set(umbrella, (umbrellaFreq.get(umbrella) ?? 0) + 1);
          }
        }
      }
    }
  }

  // Return umbrella values sorted by frequency descending, then alphabetically
  const available = Array.from(umbrellaFreq.entries())
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .map(([value]) => value);

  return NextResponse.json({ available });
}
