import { Redis } from "@upstash/redis";
import type { Pod, PodRequest } from "@/types";

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

export async function updatePod(podId: string, updates: Partial<Pod>): Promise<Pod | null> {
  const existing = await getPod(podId);
  if (!existing) return null;
  const updated = { ...existing, ...updates };
  await redis.set(`pod:${podId}`, updated);
  return updated;
}

export async function addPodMember(podId: string, userId: string): Promise<void> {
  const pod = await getPod(podId);
  if (!pod) return;
  if (pod.memberIds.includes(userId)) return;
  await savePod({ ...pod, memberIds: [...pod.memberIds, userId] });
}

export async function removePodMember(podId: string, userId: string): Promise<void> {
  const pod = await getPod(podId);
  if (!pod) return;
  await savePod({
    ...pod,
    memberIds: pod.memberIds.filter((id) => id !== userId),
    pendingRequests: pod.pendingRequests.filter((r) => r.userId !== userId),
  });
}

export async function addPendingRequest(podId: string, request: PodRequest): Promise<void> {
  const pod = await getPod(podId);
  if (!pod) return;
  const already = pod.pendingRequests.some((r) => r.userId === request.userId);
  if (already) return;
  await savePod({ ...pod, pendingRequests: [...pod.pendingRequests, request] });
}

export async function updateRequestStatus(
  podId: string,
  userId: string,
  status: PodRequest["status"]
): Promise<void> {
  const pod = await getPod(podId);
  if (!pod) return;
  await savePod({
    ...pod,
    pendingRequests: pod.pendingRequests.map((r) =>
      r.userId === userId ? { ...r, status } : r
    ),
  });
}

export async function removeRequest(podId: string, userId: string): Promise<void> {
  const pod = await getPod(podId);
  if (!pod) return;
  await savePod({
    ...pod,
    pendingRequests: pod.pendingRequests.filter((r) => r.userId !== userId),
  });
}

/** Check if a user is a member of any pod — returns the podId or null. */
export async function findUserPod(userId: string): Promise<string | null> {
  const podId = process.env.POD_ID ?? "main";
  const pod = await getPod(podId);
  if (!pod) return null;
  if (pod.memberIds.includes(userId)) return podId;
  return null;
}
