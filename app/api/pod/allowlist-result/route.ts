/**
 * Webhook called by GitHub Actions Playwright scripts to report the result
 * of an allowlist operation (add/remove) or session capture.
 */
import { NextRequest, NextResponse } from "next/server";
import { getPod, addPodMember, updateRequestStatus, removeRequest } from "@/lib/pods";
import { encrypt } from "@/lib/encryption";

type WebhookPayload =
  | { event: "session_captured"; podId: string; sessionState: string }
  | { event: "session_error"; podId: string; error: string }
  | { event: "allowlist_updated"; podId: string; action: "add" | "remove"; email: string }
  | { event: "allowlist_error"; podId: string; action: "add" | "remove"; email: string; error: string };

export async function POST(request: NextRequest) {
  // Verify webhook secret
  const authHeader = request.headers.get("authorization");
  const secret = process.env.WEBHOOK_SECRET;
  if (!secret || authHeader !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const payload = await request.json() as WebhookPayload;
  const pod = await getPod(payload.podId);
  if (!pod) return NextResponse.json({ error: "Pod not found" }, { status: 404 });

  if (payload.event === "session_captured") {
    const encrypted = encrypt(payload.sessionState);
    // Store session with 30-day expiry
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
    const { updatePod } = await import("@/lib/pods");
    await updatePod(payload.podId, {
      devPortalSessionEncrypted: encrypted,
      devPortalSessionExpiresAt: expiresAt,
    });
    return NextResponse.json({ ok: true });
  }

  if (payload.event === "session_error") {
    console.error(`Session capture failed for pod ${payload.podId}:`, payload.error);
    return NextResponse.json({ ok: true });
  }

  if (payload.event === "allowlist_updated" && payload.action === "add") {
    // Find the request by email and move them to memberIds
    const req = pod.pendingRequests.find((r) => r.userEmail === payload.email);
    if (req) {
      await addPodMember(payload.podId, req.userId);
      await removeRequest(payload.podId, req.userId);
    }
    return NextResponse.json({ ok: true });
  }

  if (payload.event === "allowlist_error" && payload.action === "add") {
    // Revert processing → pending so admin can retry
    const req = pod.pendingRequests.find((r) => r.userEmail === payload.email);
    if (req) await updateRequestStatus(payload.podId, req.userId, "pending");
    return NextResponse.json({ ok: true });
  }

  // allowlist_updated (remove) and allowlist_error (remove) are fire-and-forget;
  // the member was already removed from Redis in /api/pod/remove.
  return NextResponse.json({ ok: true });
}
