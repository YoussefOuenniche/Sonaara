import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { getUser } from "@/lib/store";
import { Redis } from "@upstash/redis";

const redis = new Redis({
  url: process.env.KV_REST_API_URL!,
  token: process.env.KV_REST_API_TOKEN!,
});

export async function POST() {
  const session = await getSession();
  if (!session.userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const existing = await getUser(session.userId);
  if (!existing) return NextResponse.json({ error: "User not found" }, { status: 404 });

  await redis.set(`user:${session.userId}`, { ...existing, discoverLikes: [] });
  return NextResponse.json({ ok: true, cleared: true });
}
