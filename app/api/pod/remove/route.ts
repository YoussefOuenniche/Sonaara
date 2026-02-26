import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { getPod, removePodMember, updateRequestStatus } from "@/lib/pods";
import { triggerAllowlistUpdate } from "@/lib/devportal";
import { getUser } from "@/lib/store";

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session.userId || !session.accessToken) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { podId, userId } = await request.json() as { podId: string; userId: string };
  if (!podId || !userId) {
    return NextResponse.json({ error: "Missing podId or userId" }, { status: 400 });
  }

  const pod = await getPod(podId);
  if (!pod) return NextResponse.json({ error: "Pod not found" }, { status: 404 });

  // Only admin can remove members
  if (pod.adminUserId !== session.userId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Can't remove yourself (admin)
  if (userId === session.userId) {
    return NextResponse.json({ error: "Cannot remove pod admin" }, { status: 400 });
  }

  // Find the email — check pending requests first, then the user's stored record
  const pendingReq = pod.pendingRequests.find((r) => r.userId === userId);
  let email = pendingReq?.userEmail ?? null;

  if (!email) {
    // Fall back to stored user record (email might be missing if they never requested via join flow)
    const userRecord = await getUser(userId);
    email = userRecord?.userEmail ?? null;
  }

  // Remove from pod data immediately
  await removePodMember(podId, userId);

  // If we have an email, trigger Spotify allowlist removal
  if (email) {
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://sonaara.vercel.app";
    triggerAllowlistUpdate({
      action: "remove",
      email,
      podId,
      webhookUrl: baseUrl,
    }).catch((err) => {
      console.error("Allowlist remove dispatch failed:", err.message);
    });
  }

  return NextResponse.json({ status: "removed" });
}
