import { promises as fs } from "fs";
import path from "path";
import type { Track, Signature } from "@/types";

// NOTE: File-based store for local development only.
// Replace with a real database before deploying — this store is not safe
// for concurrent writes and will not persist on serverless platforms.

const STORE_PATH = path.join(process.cwd(), "data", "users.json");

const VALID_DATE_KEY = /^\d{4}-\d{2}-\d{2}$/;

export interface UserRecord {
  userId: string;
  userName: string;
  userImage: string | null;
  updatedAt: string; // ISO string
  signature: Signature | null;
  lastTrack: Track | null;
  signatureHistory: Record<string, Signature | null>; // "YYYY-MM-DD" → Signature
}

type Store = Record<string, UserRecord>;

async function readStore(): Promise<Store> {
  try {
    const raw = await fs.readFile(STORE_PATH, "utf-8");
    return JSON.parse(raw) as Store;
  } catch {
    return {};
  }
}

async function writeStore(store: Store): Promise<void> {
  await fs.mkdir(path.dirname(STORE_PATH), { recursive: true });
  await fs.writeFile(STORE_PATH, JSON.stringify(store, null, 2), "utf-8");
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
  const store = await readStore();
  return store[userId] ?? null;
}

/**
 * Upsert the user record and merge historyUpdates (a map of YYYY-MM-DD → Signature)
 * into their stored signature history. Invalid keys are silently dropped.
 */
export async function upsertUser(
  record: Omit<UserRecord, "signatureHistory">,
  historyUpdates: Record<string, Signature | null>
): Promise<void> {
  const store = await readStore();
  const existing = store[record.userId];

  const merged: Record<string, Signature | null> = {
    ...(existing?.signatureHistory ?? {}),
    ...historyUpdates,
  };

  store[record.userId] = { ...record, signatureHistory: cleanHistory(merged) };
  await writeStore(store);
}

export async function getUsers(userIds: string[]): Promise<UserRecord[]> {
  if (!userIds.length) return [];
  const store = await readStore();
  return userIds.flatMap((id) => (store[id] ? [store[id]] : []));
}
