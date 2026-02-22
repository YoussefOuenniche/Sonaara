import { Redis } from "@upstash/redis";
import type { Pod } from "@/types";

const redis = new Redis({
  url: process.env.KV_REST_API_URL!,
  token: process.env.KV_REST_API_TOKEN!,
});

export async function getPod(podId: string): Promise<Pod | null> {
  return redis.get<Pod>(`pod:${podId}`);
}

export async function savePod(pod: Pod): Promise<void> {
  await redis.set(`pod:${pod.podId}`, pod);
}

export async function updatePod(podId: string, partial: Partial<Pod>): Promise<void> {
  const existing = await redis.get<Pod>(`pod:${podId}`);
  if (!existing) return;
  await redis.set(`pod:${podId}`, { ...existing, ...partial });
}

export const POD_MAX_MEMBERS = 5; // admin + 4 others

export async function addPodMember(podId: string, userId: string): Promise<void> {
  const existing = await redis.get<Pod>(`pod:${podId}`);
  if (!existing) return;
  if (existing.memberIds.includes(userId)) return;
  if (existing.memberIds.length >= POD_MAX_MEMBERS) return; // cap reached
  await Promise.all([
    redis.set(`pod:${podId}`, {
      ...existing,
      memberIds: [...existing.memberIds, userId],
    }),
    redis.set(`user:${userId}:podId`, podId),
  ]);
}

export async function getUserPodId(userId: string): Promise<string | null> {
  return redis.get<string>(`user:${userId}:podId`);
}

export async function setUserPodId(userId: string, podId: string): Promise<void> {
  await redis.set(`user:${userId}:podId`, podId);
}

export async function addPendingEmail(podId: string, email: string): Promise<void> {
  await redis.rpush(`pod:${podId}:pending`, email);
}

// Store email → userId so approve can directly add the user to memberIds
export async function storeJoinEmailUserId(podId: string, email: string, userId: string): Promise<void> {
  await redis.set(`pod:${podId}:email:${email}`, userId);
}

export async function getJoinEmailUserId(podId: string, email: string): Promise<string | null> {
  return redis.get<string>(`pod:${podId}:email:${email}`);
}

export async function getPendingEmails(podId: string): Promise<string[]> {
  return redis.lrange<string>(`pod:${podId}:pending`, 0, -1);
}

export async function clearPendingEmails(podId: string): Promise<void> {
  await redis.del(`pod:${podId}:pending`);
}
