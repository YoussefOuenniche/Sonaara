import { NextResponse } from "next/server";
import { getSession, getAccessToken } from "@/lib/session";
import { getUser } from "@/lib/store";
import { mapToUmbrellas } from "@/lib/genres";
import { resolveUserLibrary, loadFriendsWithNames } from "@/lib/discover";
import type { DiscoverTrack } from "@/types";

function countUmbrellas(tracks: DiscoverTrack[], exclude: Set<string>): Map<string, number> {
  const freq = new Map<string, number>();
  for (const track of tracks) {
    if (exclude.has(track.id)) continue;
    const seen = new Set<string>();
    for (const g of track.genres ?? []) {
      for (const umbrella of mapToUmbrellas(g)) {
        if (!seen.has(umbrella)) {
          seen.add(umbrella);
          freq.set(umbrella, (freq.get(umbrella) ?? 0) + 1);
        }
      }
    }
  }
  return freq;
}

export async function GET() {
  const session = await getSession();
  if (!session.userId) return NextResponse.json({ available: [] });

  const accessToken = await getAccessToken();
  if (!accessToken) return NextResponse.json({ available: [] });

  const userId = session.userId;
  const currentUser = await getUser(userId);
  const myLikedTracks = await resolveUserLibrary(userId, currentUser, accessToken);
  const myLikedIds = new Set(myLikedTracks.map((t) => t.id));
  const mySkipped = new Set(currentUser?.skippedTrackIds ?? []);
  const excluded = new Set([...myLikedIds, ...mySkipped]);

  const { friends } = await loadFriendsWithNames(userId, "");
  let umbrellaFreq = countUmbrellas(friends.flatMap((f) => f.likedTracks ?? []), excluded);

  // Fallback: count from own library if no friends have tracks in pool
  if (umbrellaFreq.size === 0) umbrellaFreq = countUmbrellas(myLikedTracks, mySkipped);

  const available = Array.from(umbrellaFreq.entries())
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .map(([value]) => value);

  return NextResponse.json({ available });
}
