import { NextRequest, NextResponse } from "next/server";
import { getPod } from "@/lib/pods";
import { decrypt } from "@/lib/encryption";

// Internal endpoint — only accessible to Playwright scripts via WEBHOOK_SECRET.
// Returns decrypted Playwright storage state so the script can restore the session.
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ podId: string }> }
) {
  const auth = request.headers.get("authorization") ?? "";
  if (auth !== `Bearer ${process.env.WEBHOOK_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { podId } = await params;
  const pod = await getPod(podId);

  if (!pod) {
    return NextResponse.json({ error: "Pod not found" }, { status: 404 });
  }
  if (!pod.sessionCookiesEncrypted) {
    return NextResponse.json({ error: "No session cookies stored for this pod" }, { status: 404 });
  }

  const sessionCookies = decrypt(pod.sessionCookiesEncrypted);
  return NextResponse.json({ sessionCookies });
}
