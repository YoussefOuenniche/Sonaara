import { NextRequest, NextResponse } from "next/server";
import { getPod, updatePod, clearPendingEmails } from "@/lib/pods";
import { encrypt } from "@/lib/encryption";

function verifySecret(request: NextRequest): boolean {
  const auth = request.headers.get("authorization") ?? "";
  return auth === `Bearer ${process.env.WEBHOOK_SECRET}`;
}

export async function POST(request: NextRequest) {
  if (!verifySecret(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json() as {
    event: string;
    podId: string;
    clientId?: string;
    clientSecret?: string;
    spotifyAppId?: string;
    sessionCookies?: string;
    emails?: string[];
    message?: string;
  };

  const { event, podId } = body;
  if (!podId) {
    return NextResponse.json({ error: "Missing podId" }, { status: 400 });
  }

  const pod = await getPod(podId);
  if (!pod) {
    return NextResponse.json({ error: "Pod not found" }, { status: 404 });
  }

  if (event === "pod_created") {
    const { clientId, clientSecret, spotifyAppId, sessionCookies } = body;
    if (!clientId || !clientSecret) {
      return NextResponse.json({ error: "Missing credentials" }, { status: 400 });
    }
    await updatePod(podId, {
      clientId,
      clientSecretEncrypted: encrypt(clientSecret),
      spotifyAppId: spotifyAppId ?? "",
      sessionCookiesEncrypted: sessionCookies ? encrypt(sessionCookies) : "",
      status: "ready",
    });
    return NextResponse.json({ ok: true });
  }

  if (event === "pod_error") {
    await updatePod(podId, {
      status: "error",
      errorMessage: body.message ?? "Unknown error",
    });
    return NextResponse.json({ ok: true });
  }

  if (event === "allowlist_updated") {
    // Update session cookies so future allowlist additions work
    if (body.sessionCookies) {
      await updatePod(podId, {
        sessionCookiesEncrypted: encrypt(body.sessionCookies),
      });
    }
    // Clear pending email queue
    await clearPendingEmails(podId);
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: `Unknown event: ${event}` }, { status: 400 });
}
