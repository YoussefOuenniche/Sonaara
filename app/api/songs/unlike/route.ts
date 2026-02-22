import { NextRequest, NextResponse } from "next/server";
import { getSession, getAccessToken } from "@/lib/session";
import { removeLikedTrack } from "@/lib/store";

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session.userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const accessToken = await getAccessToken();
  if (!accessToken) return NextResponse.json({ error: "No token" }, { status: 401 });

  const { trackId } = await request.json() as { trackId: string };
  if (!trackId) return NextResponse.json({ error: "Missing trackId" }, { status: 400 });

  // Remove from Spotify liked songs
  await fetch(`https://api.spotify.com/v1/me/tracks`, {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ ids: [trackId] }),
  }).catch(() => {});

  // Remove from Redis cache
  await removeLikedTrack(session.userId, trackId);

  return NextResponse.json({ ok: true });
}
