import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { getUser } from "@/lib/store";
import { Redis } from "@upstash/redis";

const redis = new Redis({
  url: process.env.KV_REST_API_URL!,
  token: process.env.KV_REST_API_TOKEN!,
});

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session.userId || !session.accessToken) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { targetUserId, hidden } = await request.json() as {
    targetUserId: string;
    hidden: boolean;
  };

  const existing = await getUser(session.userId);
  if (!existing) return NextResponse.json({ error: "User not found" }, { status: 404 });

  const current = existing.hiddenPodMemberIds ?? [];
  const next = hidden
    ? Array.from(new Set([...current, targetUserId]))
    : current.filter((id) => id !== targetUserId);

  await redis.set(`user:${session.userId}`, { ...existing, hiddenPodMemberIds: next });
  return NextResponse.json({ ok: true, hiddenPodMemberIds: next });
}
