import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { getUsers, upsertUser } from "@/lib/store";
import {
  getYesterdayTracks,
  getYesterdayTracksWithGenres,
  getAudioFeatures,
  aggregateAudioFeatures,
  getDayKey,
} from "@/lib/spotify";
import { generateSignature } from "@/lib/claude";
import type { UserRecord } from "@/lib/store";
import type { Signature } from "@/types";

async function generateMissingSignature(record: UserRecord): Promise<UserRecord | null> {
  const tz = record.timezone ?? "UTC";
  const yesterdayKey = getDayKey(1, tz);

  // Skip if already generated today
  if (yesterdayKey in (record.signatureHistory ?? {})) return null;

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

  const rawTracks = await getYesterdayTracks(accessToken, tz).catch(() => []);
  let signature: Signature | null = null;

  if (rawTracks.length > 0) {
    const [tracksWithGenres, audioFeaturesRaw] = await Promise.all([
      getYesterdayTracksWithGenres(rawTracks, accessToken).catch(() =>
        rawTracks.map((t) => ({ ...t, genres: [] as string[] }))
      ),
      getAudioFeatures(rawTracks.map((t) => t.id), accessToken).catch(() => []),
    ]);
    const audioFeatures = aggregateAudioFeatures(audioFeaturesRaw);
    signature = await generateSignature(tracksWithGenres, audioFeatures).catch(() => null);
  }

  await upsertUser(
    {
      userId: record.userId,
      userName: record.userName,
      userImage: record.userImage,
      updatedAt: new Date().toISOString(),
      signature,
      lastTrack: record.lastTrack,
      timezone: tz,
      refreshToken: tokenData.refresh_token ?? record.refreshToken,
    },
    { [yesterdayKey]: signature }
  );

  return {
    ...record,
    signature,
    signatureHistory: { ...(record.signatureHistory ?? {}), [yesterdayKey]: signature },
  };
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

  // Only process users who are actually missing yesterday's signature
  const needsGeneration = records.filter((r) => {
    const tz = r.timezone ?? "UTC";
    const yesterdayKey = getDayKey(1, tz);
    return !(yesterdayKey in (r.signatureHistory ?? {}));
  });

  if (!needsGeneration.length) return NextResponse.json({ users: [] });

  const results = await Promise.allSettled(needsGeneration.map(generateMissingSignature));

  const users = results
    .map((r) => (r.status === "fulfilled" ? r.value : null))
    .filter((u): u is UserRecord => u !== null);

  return NextResponse.json({ users });
}
