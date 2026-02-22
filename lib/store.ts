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
  skippedTrackIds?: string[]; // tracks skipped in discover, don't show again
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
    ...record,
    signatureHistory: cleanHistory(merged),
  };

  await redis.set(`user:${record.userId}`, newRecord);
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

export async function addSkippedTrack(userId: string, trackId: string): Promise<void> {
  const existing = await redis.get<UserRecord>(`user:${userId}`);
  if (!existing) return;
  const skipped = Array.from(new Set([...(existing.skippedTrackIds ?? []), trackId]));
  await redis.set(`user:${userId}`, { ...existing, skippedTrackIds: skipped });
}
