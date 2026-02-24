import { getUsers, getFriendIds, setLikedTracks, type UserRecord } from "@/lib/store";
import { getLikedTracks } from "@/lib/spotify";
import type { DiscoverTrack } from "@/types";

/** Fisher-Yates in-place shuffle. Returns the same array. */
export function shuffle<T>(arr: T[]): T[] {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

/**
 * Resolve the user's liked tracks from Redis cache.
 * Fetches from Spotify on a cold cache; refreshes stale caches (pre-previewUrl) in the background.
 */
export async function resolveUserLibrary(
  userId: string,
  currentUser: UserRecord | null,
  accessToken: string
): Promise<DiscoverTrack[]> {
  let tracks = currentUser?.likedTracks ?? [];
  if (tracks.length === 0) {
    tracks = await getLikedTracks(accessToken).catch(() => []);
    if (tracks.length > 0 && currentUser) setLikedTracks(userId, tracks).catch(() => {});
  } else if (tracks[0].previewUrl === undefined) {
    // Cache predates previewUrl field — refresh in the background
    getLikedTracks(accessToken)
      .then((fresh) => { if (fresh.length > 0) setLikedTracks(userId, fresh).catch(() => {}); })
      .catch(() => {});
  }
  return tracks;
}

/** Load friend records and build a userId → display-name map. */
export async function loadFriendsWithNames(
  userId: string,
  selfName: string
): Promise<{ friends: UserRecord[]; nameMap: Map<string, string> }> {
  const friendIds = await getFriendIds(userId);
  const friends = friendIds.length ? await getUsers(friendIds) : [];
  const nameMap = new Map([[userId, selfName]]);
  for (const f of friends) nameMap.set(f.userId, f.userName);
  return { friends, nameMap };
}

/**
 * Build the raw discover pool from friends' liked tracks,
 * excluding tracks the user already likes or has skipped.
 */
export function buildFriendPool(
  friends: UserRecord[],
  myLikedIds: Set<string>,
  mySkipped: Set<string>,
  nameMap: Map<string, string>
): Map<string, DiscoverTrack> {
  const poolMap = new Map<string, DiscoverTrack>();
  for (const friend of friends) {
    for (const track of friend.likedTracks ?? []) {
      if (myLikedIds.has(track.id) || mySkipped.has(track.id)) continue;
      if (poolMap.has(track.id)) {
        const existing = poolMap.get(track.id)!;
        existing.likedByUserIds.push(friend.userId);
        existing.likedByNames.push(nameMap.get(friend.userId) ?? "a friend");
      } else {
        poolMap.set(track.id, {
          ...track,
          likedByUserIds: [friend.userId],
          likedByNames: [nameMap.get(friend.userId) ?? "a friend"],
        });
      }
    }
  }
  return poolMap;
}

/**
 * Shuffle and interleave a pool for a fair discover queue:
 * singles are round-robined across per-friend buckets, with one
 * community track (liked by 2+ friends) injected every 4th position.
 */
export function interleavePool(pool: DiscoverTrack[]): DiscoverTrack[] {
  const community = shuffle(pool.filter((t) => t.likedByUserIds.length >= 2));
  const singles = pool.filter((t) => t.likedByUserIds.length < 2);

  // Group singles by primary friend, shuffle each bucket, then shuffle bucket order
  const buckets = new Map<string, DiscoverTrack[]>();
  for (const track of singles) {
    const key = track.likedByUserIds[0] ?? "fallback";
    if (!buckets.has(key)) buckets.set(key, []);
    buckets.get(key)!.push(track);
  }
  const queues = shuffle(Array.from(buckets.values()).map((b) => shuffle(b)));

  // Round-robin interleave: A1, B1, C1, A2, B2, C2, …
  const interleaved: DiscoverTrack[] = [];
  const ptrs = queues.map(() => 0);
  let active = true;
  while (active) {
    active = false;
    for (let i = 0; i < queues.length; i++) {
      if (ptrs[i] < queues[i].length) { interleaved.push(queues[i][ptrs[i]++]); active = true; }
    }
  }

  if (community.length === 0) return interleaved;

  // Inject 1 community track every 4th slot: 3 singles → 1 community → repeat
  const result: DiscoverTrack[] = [];
  let si = 0, ci = 0;
  while (si < interleaved.length || ci < community.length) {
    for (let j = 0; j < 3 && si < interleaved.length; j++, si++) result.push(interleaved[si]);
    if (ci < community.length) result.push(community[ci++]);
  }
  return result;
}
