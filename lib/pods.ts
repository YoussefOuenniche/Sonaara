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

export async function addPodMember(podId: string, userId: string): Promise<void> {
  const existing = await redis.get<Pod>(`pod:${podId}`);
  if (!existing) return;
  if (existing.memberIds.includes(userId)) return;
  await redis.set(`pod:${podId}`, {
    ...existing,
    memberIds: [...existing.memberIds, userId],
  });
}

export async function addPendingEmail(podId: string, email: string): Promise<void> {
  await redis.rpush(`pod:${podId}:pending`, email);
}

export async function getPendingEmails(podId: string): Promise<string[]> {
  return redis.lrange<string>(`pod:${podId}:pending`, 0, -1);
}

export async function clearPendingEmails(podId: string): Promise<void> {
  await redis.del(`pod:${podId}:pending`);
}
