import { Redis } from "@upstash/redis";
import type { Track, Signature, DiscoverTrack } from "@/types";

const redis = new Redis({
  url: process.env.KV_REST_API_URL!,
  token: process.env.KV_REST_API_TOKEN!,
});

const VALID_DATE_KEY = /^\d{4}-\d{2}-\d{2}$/;

export interface UserRecord {
  userId: string;
  userName: string;
  userImage: string | null;
  updatedAt: string; // ISO string
  signature: Signature | null;
  lastTrack: Track | null;
  signatureHistory: Record<string, Signature | null>; // "YYYY-MM-DD" → Signature
  friendIds?: string[]; // persisted friend list
  likedTracks?: DiscoverTrack[]; // cached liked songs for discover pool
  skippedTrackIds?: string[]; // track IDs skipped in discover (for fast Set lookup)
  skippedTracks?: DiscoverTrack[]; // full skipped track objects (for Songs tab display)
  refreshToken?: string; // Spotify refresh token — used by daily cron
  timezone?: string; // IANA timezone string, e.g. "America/New_York"
}

function cleanHistory(
  raw: Record<string, Signature | null>
): Record<string, Signature | null> {
  // Keep only valid YYYY-MM-DD keys, newest 60 entries
  const valid: Record<string, Signature | null> = {};
  for (const [k, v] of Object.entries(raw)) {
    if (VALID_DATE_KEY.test(k)) valid[k] = v;
  }
  const trimmed: Record<string, Signature | null> = {};
  for (const k of Object.keys(valid).sort().slice(-60)) {
    trimmed[k] = valid[k];
  }
  return trimmed;
}

export async function getUser(userId: string): Promise<UserRecord | null> {
  const record = await redis.get<UserRecord>(`user:${userId}`);
  return record ?? null;
}

/**
 * Upsert the user record and merge historyUpdates (a map of YYYY-MM-DD → Signature)
 * into their stored signature history. Invalid keys are silently dropped.
 */
export async function upsertUser(
  record: Omit<UserRecord, "signatureHistory">,
  historyUpdates: Record<string, Signature | null>
): Promise<void> {
  const existing = await redis.get<UserRecord>(`user:${record.userId}`);

  const merged: Record<string, Signature | null> = {
    ...(existing?.signatureHistory ?? {}),
    ...historyUpdates,
  };

  const newRecord: UserRecord = {
    // Preserve fields that upsertUser doesn't manage
    friendIds: existing?.friendIds,
    likedTracks: existing?.likedTracks,
    skippedTrackIds: existing?.skippedTrackIds,
    skippedTracks: existing?.skippedTracks,
    refreshToken: existing?.refreshToken,
    timezone: existing?.timezone,
    ...record,
    signatureHistory: cleanHistory(merged),
  };

  await redis.set(`user:${record.userId}`, newRecord);
}

/** Store (or update) a user's Spotify refresh token in their Redis record. */
export async function storeUserRefreshToken(userId: string, refreshToken: string): Promise<void> {
  const existing = await redis.get<UserRecord>(`user:${userId}`);
  if (existing) {
    await redis.set(`user:${userId}`, { ...existing, refreshToken });
  } else {
    // User record doesn't exist yet — store a stub so we can populate it later
    const stub: UserRecord = {
      userId,
      userName: "",
      userImage: null,
      updatedAt: new Date().toISOString(),
      signature: null,
      lastTrack: null,
      signatureHistory: {},
      refreshToken,
    };
    await redis.set(`user:${userId}`, stub);
  }
}

/** Add a user ID to the global index set so the cron can enumerate all users. */
export async function addToUserIndex(userId: string): Promise<void> {
  await redis.sadd("users:all", userId);
}

/** Return all user IDs known to the system. */
export async function getAllUserIds(): Promise<string[]> {
  const members = await redis.smembers("users:all");
  return members as string[];
}

export async function getUsers(userIds: string[]): Promise<UserRecord[]> {
  if (!userIds.length) return [];
  const keys = userIds.map((id) => `user:${id}`);
  const records = await redis.mget<UserRecord[]>(...keys);
  return records.filter((r): r is UserRecord => r !== null);
}

export async function getFriendIds(userId: string): Promise<string[]> {
  const record = await redis.get<UserRecord>(`user:${userId}`);
  return record?.friendIds ?? [];
}

export async function setFriendIds(userId: string, friendIds: string[]): Promise<void> {
  const existing = await redis.get<UserRecord>(`user:${userId}`);
  if (!existing) return;
  await redis.set(`user:${userId}`, { ...existing, friendIds });
}

export async function setLikedTracks(userId: string, likedTracks: DiscoverTrack[]): Promise<void> {
  const existing = await redis.get<UserRecord>(`user:${userId}`);
  if (!existing) return;
  await redis.set(`user:${userId}`, { ...existing, likedTracks });
}

export async function addSkippedTrack(userId: string, trackId: string, track?: DiscoverTrack): Promise<void> {
  const existing = await redis.get<UserRecord>(`user:${userId}`);
  if (!existing) return;
  const skippedIds = Array.from(new Set([...(existing.skippedTrackIds ?? []), trackId]));
  const skippedTracks = existing.skippedTracks ?? [];
  const alreadyFull = skippedTracks.some((t) => t.id === trackId);
  const newSkippedTracks = track && !alreadyFull
    ? [...skippedTracks, { ...track, likedByUserIds: [], likedByNames: [] }]
    : skippedTracks;
  await redis.set(`user:${userId}`, { ...existing, skippedTrackIds: skippedIds, skippedTracks: newSkippedTracks });
}

export async function removeSkippedTrack(userId: string, trackId: string): Promise<void> {
  const existing = await redis.get<UserRecord>(`user:${userId}`);
  if (!existing) return;
  await redis.set(`user:${userId}`, {
    ...existing,
    skippedTrackIds: (existing.skippedTrackIds ?? []).filter((id) => id !== trackId),
    skippedTracks: (existing.skippedTracks ?? []).filter((t) => t.id !== trackId),
  });
}

export async function removeLikedTrack(userId: string, trackId: string): Promise<void> {
  const existing = await redis.get<UserRecord>(`user:${userId}`);
  if (!existing) return;
  await redis.set(`user:${userId}`, {
    ...existing,
    likedTracks: (existing.likedTracks ?? []).filter((t) => t.id !== trackId),
  });
}
