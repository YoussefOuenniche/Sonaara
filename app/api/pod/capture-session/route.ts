/**
 * Admin-only endpoint to trigger a fresh dev portal session capture via GitHub Actions.
 * Called from the admin UI when the current session has expired or doesn't exist.
 */
import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { triggerSessionCapture } from "@/lib/devportal";

export async function POST() {
  const session = await getSession();
  if (!session.userId || session.userId !== process.env.ADMIN_USER_ID) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const podId = process.env.POD_ID ?? "main";
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://sonaara.vercel.app";

  try {
    await triggerSessionCapture({ podId, webhookUrl: baseUrl });
    return NextResponse.json({ status: "triggered" });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: msg }, { status: 502 });
  }
}
