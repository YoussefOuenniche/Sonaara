import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { getUser, getUsers, getFriendIds } from "@/lib/store";
import type { DiscoverTrack } from "@/types";

export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session.userId) return NextResponse.json({ tracks: [] });

  const genre = request.nextUrl.searchParams.get("genre") ?? "";

  const currentUser = await getUser(session.userId);
  const myLikedIds = new Set((currentUser?.likedTracks ?? []).map((t) => t.id));
  const mySkipped = new Set(currentUser?.skippedTrackIds ?? []);

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

  // Fallback: if pool is empty, seed with the current user's own liked tracks
  if (pool.length === 0 && (currentUser?.likedTracks ?? []).length > 0) {
    const myName = currentUser!.userName ?? "you";
    pool = (currentUser!.likedTracks ?? [])
      .filter((t) => !mySkipped.has(t.id))
      .map((track) => ({
        ...track,
        likedByUserIds: [session.userId!],
        likedByNames: [myName],
      }));
  }

  // Filter by genre
  if (genre && genre !== "anything") {
    const g = genre.toLowerCase();
    pool = pool.filter((t) =>
      t.genres.some((tg) => tg.toLowerCase().includes(g))
    );
  }

  // Sort: tracks liked by more people first
  pool.sort((a, b) => b.likedByUserIds.length - a.likedByUserIds.length);

  return NextResponse.json({ tracks: pool });
}
