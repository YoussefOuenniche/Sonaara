import { NextRequest, NextResponse } from "next/server";
import {
  getAllUserIds,
  getUser,
  upsertUser,
  storeUserRefreshToken,
} from "@/lib/store";
import {
  getYesterdayTracks,
  getYesterdayTracksWithGenres,
  getAudioFeatures,
  aggregateAudioFeatures,
  getDayKey,
  getLastPlayedTrack,
} from "@/lib/spotify";
import { generateSignature } from "@/lib/claude";

export const maxDuration = 300; // 5 minutes — enough for many users

export async function GET(request: NextRequest) {
  // Verify this is coming from Vercel's cron scheduler or an authorized manual call
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userIds = await getAllUserIds();
  if (!userIds.length) {
    return NextResponse.json({ updated: 0, skipped: 0, failed: 0, message: "No users found" });
  }

  let updated = 0;
  let skipped = 0;
  let failed = 0;

  // Process in batches of 5 to stay within API rate limits
  const BATCH_SIZE = 5;
  for (let i = 0; i < userIds.length; i += BATCH_SIZE) {
    const batch = userIds.slice(i, i + BATCH_SIZE);
    const results = await Promise.allSettled(batch.map(processUser));
    for (const result of results) {
      if (result.status === "rejected") {
        failed++;
      } else {
        if (result.value === "updated") updated++;
        else skipped++;
      }
    }
  }

  return NextResponse.json({ updated, skipped, failed, total: userIds.length });
}

async function processUser(userId: string): Promise<"updated" | "skipped"> {
  const record = await getUser(userId);
  if (!record?.refreshToken) return "skipped";

  const tz = record.timezone ?? "UTC";
  const yesterdayKey = getDayKey(1, tz);

  // Exchange refresh token for a fresh access token
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

  if (!tokenRes.ok) return "skipped";

  const tokenData = await tokenRes.json();
  const accessToken: string = tokenData.access_token;

  // Persist rotated refresh token if Spotify issued a new one
  if (tokenData.refresh_token && tokenData.refresh_token !== record.refreshToken) {
    await storeUserRefreshToken(userId, tokenData.refresh_token).catch(() => {});
  }

  // Always fetch the latest played track so friends see fresh data
  const lastTrack = await getLastPlayedTrack(accessToken).catch(() => record.lastTrack);

  // Skip expensive signature generation if already done for yesterday
  const signatureAlreadyDone = yesterdayKey in (record.signatureHistory ?? {});
  if (signatureAlreadyDone) {
    await upsertUser(
      {
        userId: record.userId,
        userName: record.userName,
        userImage: record.userImage,
        updatedAt: new Date().toISOString(),
        signature: record.signature,
        lastTrack,
        timezone: tz,
      },
      {}
    );
    return "updated";
  }

  // Fetch yesterday's tracks and generate signature
  const rawTracks = await getYesterdayTracks(accessToken, tz).catch(() => []);

  let signature = null;
  if (rawTracks.length > 0) {
    const [tracksWithGenres, audioFeaturesRaw] = await Promise.all([
      getYesterdayTracksWithGenres(rawTracks, accessToken).catch(() => rawTracks.map((t) => ({ ...t, genres: [] as string[] }))),
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
      lastTrack,
      timezone: tz,
    },
    { [yesterdayKey]: signature }
  );

  return "updated";
}
