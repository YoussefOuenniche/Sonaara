import { NextRequest, NextResponse } from "next/server";
import { getPod, addPendingEmail, POD_MAX_MEMBERS } from "@/lib/pods";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ podId: string }> }
) {
  const { podId } = await params;
  const pod = await getPod(podId);

  if (!pod || pod.status !== "ready") {
    return NextResponse.json({ error: "Pod not found or not ready" }, { status: 404 });
  }

  if (pod.memberIds.length >= POD_MAX_MEMBERS) {
    return NextResponse.json({ error: "Pod is full" }, { status: 409 });
  }

  const { email } = await request.json() as { email: string };
  if (!email?.trim()) {
    return NextResponse.json({ error: "Email is required" }, { status: 400 });
  }

  await addPendingEmail(podId, email.trim().toLowerCase());
  return NextResponse.json({ ok: true });
}
