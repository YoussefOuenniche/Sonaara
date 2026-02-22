import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { Redis } from "@upstash/redis";

const redis = new Redis({
  url: process.env.KV_REST_API_URL!,
  token: process.env.KV_REST_API_TOKEN!,
});

export async function GET() {
  const session = await getSession();
  if (!session.userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Scan for all pod keys
  let cursor = 0;
  const podIds: string[] = [];
  do {
    const [next, keys] = await redis.scan(cursor, { match: "pod:????????", count: 100 });
    cursor = Number(next);
    for (const key of keys) {
      const id = (key as string).replace("pod:", "");
      if (id.length === 8) podIds.push(id);
    }
  } while (cursor !== 0);

  // Find the pod where this user is admin or member
  for (const podId of podIds) {
    const pod = await redis.get<{ adminUserId: string; memberIds: string[]; podName: string; status: string }>(`pod:${podId}`);
    if (pod && (pod.adminUserId === session.userId || pod.memberIds?.includes(session.userId))) {
      return NextResponse.json({ podId, podName: pod.podName, status: pod.status });
    }
  }

  return NextResponse.json({ error: "No pod found for your account" }, { status: 404 });
}
