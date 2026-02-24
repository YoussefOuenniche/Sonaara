import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { getUsers, upsertUser } from "@/lib/store";
import { getLastPlayedTrack } from "@/lib/spotify";
import type { UserRecord } from "@/lib/store";

async function refreshUser(record: UserRecord): Promise<UserRecord | null> {
  if (!record.refreshToken) return null;

  const tokenRes = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: record.refreshToken,
      client_id: process.env.SPOTIFY_CLIENT_ID!,
      client_secret: process.env.SPOTIFY_CLIENT_SECRET!,
    }),
  });
  if (!tokenRes.ok) return null;

  const tokenData = await tokenRes.json() as { access_token: string; refresh_token?: string };
  const accessToken = tokenData.access_token;

  const lastTrack = await getLastPlayedTrack(accessToken).catch(() => record.lastTrack);

  await upsertUser(
    {
      userId: record.userId,
      userName: record.userName,
      userImage: record.userImage,
      updatedAt: new Date().toISOString(),
      signature: record.signature,
      lastTrack,
      timezone: record.timezone,
      refreshToken: tokenData.refresh_token ?? record.refreshToken,
    },
    {}
  );

  return { ...record, lastTrack };
}

export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session.accessToken) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const raw = request.nextUrl.searchParams.get("ids") ?? "";
  const ids = raw.split(",").map((s) => s.trim()).filter(Boolean).slice(0, 10);
  if (!ids.length) return NextResponse.json({ users: [] });

  const records = await getUsers(ids);

  const results = await Promise.allSettled(records.map(refreshUser));

  const users = results
    .map((r, i) => {
      if (r.status === "fulfilled" && r.value) return r.value;
      return records[i] ?? null;
    })
    .filter((u): u is UserRecord => u !== null);

  return NextResponse.json({ users });
}
