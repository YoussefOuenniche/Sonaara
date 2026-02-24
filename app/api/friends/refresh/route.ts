import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { getUsers, upsertUser } from "@/lib/store";
import {
  getLastPlayedTrack,
  getYesterdayTracks,
  getYesterdayTracksWithGenres,
  getAudioFeatures,
  aggregateAudioFeatures,
  getDayKey,
} from "@/lib/spotify";
import { generateSignature } from "@/lib/claude";
import type { UserRecord } from "@/lib/store";
import type { Signature } from "@/types";

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
  const tz = record.timezone ?? "UTC";
  const yesterdayKey = getDayKey(1, tz);

  // Always fetch fresh lastTrack
  const lastTrack = await getLastPlayedTrack(accessToken).catch(() => record.lastTrack);

  // Only generate signature if yesterday's is missing
  const historyUpdates: Record<string, Signature | null> = {};
  const signatureAlreadyDone = yesterdayKey in (record.signatureHistory ?? {});
  let signature = record.signature;

  if (!signatureAlreadyDone) {
    const rawTracks = await getYesterdayTracks(accessToken, tz).catch(() => []);
    if (rawTracks.length > 0) {
      const [tracksWithGenres, audioFeaturesRaw] = await Promise.all([
        getYesterdayTracksWithGenres(rawTracks, accessToken).catch(() =>
          rawTracks.map((t) => ({ ...t, genres: [] as string[] }))
        ),
        getAudioFeatures(rawTracks.map((t) => t.id), accessToken).catch(() => []),
      ]);
      const audioFeatures = aggregateAudioFeatures(audioFeaturesRaw);
      signature = await generateSignature(tracksWithGenres, audioFeatures).catch(() => record.signature);
    }
    historyUpdates[yesterdayKey] = signature ?? null;
  }

  const updated: Omit<UserRecord, "signatureHistory"> = {
    userId: record.userId,
    userName: record.userName,
    userImage: record.userImage,
    updatedAt: new Date().toISOString(),
    signature,
    lastTrack,
    timezone: tz,
    refreshToken: tokenData.refresh_token ?? record.refreshToken,
  };

  await upsertUser(updated, historyUpdates);

  return {
    ...record,
    lastTrack,
    signature,
    signatureHistory: { ...(record.signatureHistory ?? {}), ...historyUpdates },
    updatedAt: updated.updatedAt,
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

  const results = await Promise.allSettled(records.map(refreshUser));

  const users = results
    .map((r, i) => {
      if (r.status === "fulfilled" && r.value) return r.value;
      return records[i] ?? null;
    })
    .filter((u): u is UserRecord => u !== null);

  return NextResponse.json({ users });
}
