import { NextRequest, NextResponse } from "next/server";
import { getSession, getAccessToken } from "@/lib/session";
import { getUser, setLikedTracks } from "@/lib/store";
import { getArtistGenres } from "@/lib/spotify";
import { getUmbrellaKeywords } from "@/lib/genres";
import { resolveUserLibrary, loadFriendsWithNames, buildFriendPool, interleavePool } from "@/lib/discover";

export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session.userId) return NextResponse.json({ tracks: [] });

  const accessToken = await getAccessToken();
  if (!accessToken) return NextResponse.json({ tracks: [] });

  const genre = request.nextUrl.searchParams.get("genre") ?? "";
  const userId = session.userId;

  const currentUser = await getUser(userId);
  const mySkipped = new Set(currentUser?.skippedTrackIds ?? []);
  const myLikedTracks = await resolveUserLibrary(userId, currentUser, accessToken);
  const myLikedIds = new Set(myLikedTracks.map((t) => t.id));

  const { friends, nameMap } = await loadFriendsWithNames(userId, currentUser?.userName ?? "you");
  let pool = Array.from(buildFriendPool(friends, myLikedIds, mySkipped, nameMap).values());

  // Re-enrich genres for stale pool tracks (cache predates genre support)
  const staleTracks = pool.filter((t) => t.genres.length === 0 && (t.artistIds?.length ?? 0) > 0);
  if (staleTracks.length > 0) {
    const artistIds = [...new Set(staleTracks.flatMap((t) => t.artistIds ?? []))];
    const genreMap = await getArtistGenres(artistIds, accessToken).catch(() => ({} as Record<string, string[]>));
    for (const track of staleTracks) {
      track.genres = [...new Set((track.artistIds ?? []).flatMap((id) => genreMap[id] ?? []))];
    }
    // Back-fill friends' caches in the background
    for (const friend of friends) {
      if ((friend.likedTracks ?? []).some((t) => t.genres.length === 0 && (t.artistIds?.length ?? 0) > 0)) {
        setLikedTracks(friend.userId, (friend.likedTracks ?? []).map((t) =>
          t.genres.length === 0 && (t.artistIds?.length ?? 0) > 0
            ? { ...t, genres: [...new Set((t.artistIds ?? []).flatMap((id) => genreMap[id] ?? []))] }
            : t
        )).catch(() => {});
      }
    }
  }

  // Fallback: seed with own liked tracks if pool is empty
  if (pool.length === 0 && myLikedTracks.length > 0) {
    const myName = currentUser?.userName ?? "you";
    pool = myLikedTracks
      .filter((t) => !mySkipped.has(t.id))
      .map((track) => ({ ...track, likedByUserIds: [userId], likedByNames: [myName] }));
  }

  // Filter by umbrella genre
  if (genre && genre !== "anything") {
    const keywords = getUmbrellaKeywords(genre.toLowerCase());
    pool = pool.filter((t) =>
      t.genres.some((tg) => keywords.some((kw) => tg.toLowerCase().includes(kw)))
    );
  }

  return NextResponse.json({ tracks: interleavePool(pool), friendCount: friends.length });
}
