import { NextResponse } from "next/server";
import { getSession, getAccessToken } from "@/lib/session";

export async function GET() {
  const session = await getSession();
  if (!session.userId || !session.accessToken) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const accessToken = await getAccessToken();
  if (!accessToken) return NextResponse.json({ error: "No token" }, { status: 401 });

  const res = await fetch("https://api.spotify.com/v1/me", {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!res.ok) return NextResponse.json({ error: "Spotify error" }, { status: 502 });

  const profile = await res.json() as { email?: string };
  return NextResponse.json({ email: profile.email ?? null });
}
