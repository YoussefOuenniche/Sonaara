import { NextResponse } from "next/server";
import { getSession, getAccessToken } from "@/lib/session";
import { getUser, getUsers, getFriendIds, setLikedTracks } from "@/lib/store";
import { getLikedTracks } from "@/lib/spotify";

// These must match the values in DiscoverView GENRES list
const GENRE_VALUES = [
  "hip-hop", "r&b", "soul", "neo-soul", "pop", "indie", "alternative",
  "rock", "grunge", "metal", "punk", "electronic", "house", "techno",
  "drum and bass", "trap", "lo-fi", "ambient", "psychedelic", "jazz",
  "blues", "funk", "disco", "gospel", "reggae", "country", "folk",
  "classical", "latin", "afrobeats", "k-pop",
];

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

  // Collect all genres from the pool (friends' tracks minus already-liked/skipped)
  const allGenres = new Set<string>();

  for (const friend of friends) {
    for (const track of friend.likedTracks ?? []) {
      if (myLikedIds.has(track.id)) continue;
      if (mySkipped.has(track.id)) continue;
      for (const g of track.genres ?? []) {
        allGenres.add(g.toLowerCase());
      }
    }
  }

  // Fallback: if no friends, use own tracks
  if (allGenres.size === 0) {
    for (const track of myLikedTracks) {
      if (mySkipped.has(track.id)) continue;
      for (const g of track.genres ?? []) {
        allGenres.add(g.toLowerCase());
      }
    }
  }

  // Match genre values against collected genres using substring matching (same as pool filter)
  const available = GENRE_VALUES.filter((value) =>
    Array.from(allGenres).some((g) => g.includes(value) || value.includes(g))
  );

  return NextResponse.json({ available });
}
