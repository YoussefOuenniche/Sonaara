import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { getPod, addPendingRequest } from "@/lib/pods";
import type { PodRequest } from "@/types";

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session.userId || !session.accessToken) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { podId, userEmail } = await request.json() as { podId: string; userEmail: string };
  if (!podId || !userEmail) {
    return NextResponse.json({ error: "Missing podId or userEmail" }, { status: 400 });
  }

  const pod = await getPod(podId);
  if (!pod) return NextResponse.json({ error: "Pod not found" }, { status: 404 });

  // Already a member
  if (pod.memberIds.includes(session.userId)) {
    return NextResponse.json({ status: "already_member" });
  }

  // Already has a pending / processing request
  const existing = pod.pendingRequests.find((r) => r.userId === session.userId);
  if (existing) {
    return NextResponse.json({ status: existing.status });
  }

  // Cap at 5 members (admin + 4 others)
  if (pod.memberIds.length >= 5) {
    return NextResponse.json({ error: "Pod is full" }, { status: 403 });
  }

  const req: PodRequest = {
    userId: session.userId,
    userName: session.userName ?? session.userId,
    userEmail,
    requestedAt: new Date().toISOString(),
    status: "pending",
  };

  await addPendingRequest(podId, req);
  return NextResponse.json({ status: "pending" });
}
