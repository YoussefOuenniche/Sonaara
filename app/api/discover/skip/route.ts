import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { addSkippedTrack } from "@/lib/store";

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session.userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { trackId } = await request.json() as { trackId: string };
  if (!trackId) return NextResponse.json({ error: "Missing trackId" }, { status: 400 });

  await addSkippedTrack(session.userId, trackId);
  return NextResponse.json({ ok: true });
}
