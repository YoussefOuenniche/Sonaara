import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { getPod, updateRequestStatus } from "@/lib/pods";
import { triggerAllowlistUpdate } from "@/lib/devportal";

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

  // Only admin can approve
  if (pod.adminUserId !== session.userId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const req = pod.pendingRequests.find((r) => r.userId === userId);
  if (!req) return NextResponse.json({ error: "Request not found" }, { status: 404 });

  // Mark as processing immediately so the UI updates
  await updateRequestStatus(podId, userId, "processing");

  // Trigger GitHub Action to add the email to the Spotify allowlist
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://sonaara.vercel.app";
  try {
    await triggerAllowlistUpdate({
      action: "add",
      email: req.userEmail,
      podId,
      webhookUrl: baseUrl,
    });
  } catch (err) {
    // Revert to pending if dispatch failed
    await updateRequestStatus(podId, userId, "pending");
    const msg = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: `Failed to trigger allowlist update: ${msg}` }, { status: 502 });
  }

  return NextResponse.json({ status: "processing" });
}
