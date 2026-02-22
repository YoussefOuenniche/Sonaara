import { NextRequest, NextResponse } from "next/server";
import { getSession, getAccessToken } from "@/lib/session";
import { getUser, getUsers, getFriendIds } from "@/lib/store";
import type { DiscoverTrack } from "@/types";

export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session.userId) return NextResponse.json({ tracks: [] });

  const accessToken = await getAccessToken();
  if (!accessToken) return NextResponse.json({ tracks: [] });

  const genre = request.nextUrl.searchParams.get("genre") ?? "";

  // Get current user's liked track IDs (to exclude)
  const currentUser = await getUser(session.userId);
  const myLikedIds = new Set((currentUser?.likedTracks ?? []).map((t) => t.id));
  const mySkipped = new Set(currentUser?.skippedTrackIds ?? []);

  // Get friends
  const friendIds = await getFriendIds(session.userId);
  if (!friendIds.length) return NextResponse.json({ tracks: [] });

  const friends = await getUsers(friendIds);

  // Build pool: tracks from friends that I haven't liked or skipped
  const poolMap = new Map<string, DiscoverTrack>();

  for (const friend of friends) {
    for (const track of friend.likedTracks ?? []) {
      if (myLikedIds.has(track.id)) continue;
      if (mySkipped.has(track.id)) continue;

      if (poolMap.has(track.id)) {
        // Already in pool — add this friend to likedByUserIds
        poolMap.get(track.id)!.likedByUserIds.push(friend.userId);
      } else {
        poolMap.set(track.id, {
          ...track,
          likedByUserIds: [friend.userId],
        });
      }
    }
  }

  let pool = Array.from(poolMap.values());

  // Filter by genre if requested
  if (genre && genre !== "anything") {
    const g = genre.toLowerCase();
    pool = pool.filter((t) =>
      t.genres.some((tg) => tg.toLowerCase().includes(g))
    );
  }

  // Sort: tracks liked by more friends first, then shuffle within groups
  pool.sort((a, b) => b.likedByUserIds.length - a.likedByUserIds.length);

  return NextResponse.json({ tracks: pool });
}
