import { NextRequest, NextResponse } from "next/server";
import { getSession, getAccessToken } from "@/lib/session";
import { getUser, setLikedTracks } from "@/lib/store";
import type { DiscoverTrack } from "@/types";

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session.userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const accessToken = await getAccessToken();
  if (!accessToken) return NextResponse.json({ error: "No token" }, { status: 401 });

  const { track } = await request.json() as { track: DiscoverTrack };
  if (!track?.id) return NextResponse.json({ error: "Missing track" }, { status: 400 });

  // Add to Spotify liked songs
  const spotifyRes = await fetch(`https://api.spotify.com/v1/me/tracks`, {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ ids: [track.id] }),
  });

  if (!spotifyRes.ok) {
    return NextResponse.json({ error: "Spotify error" }, { status: 502 });
  }

  // Update local liked tracks cache
  const user = await getUser(session.userId);
  if (user) {
    const already = (user.likedTracks ?? []).some((t) => t.id === track.id);
    if (!already) {
      await setLikedTracks(session.userId, [
        ...(user.likedTracks ?? []),
        { ...track, likedByUserIds: [], likedByNames: [] },
      ]);
    }
  }

  return NextResponse.json({ ok: true });
}
