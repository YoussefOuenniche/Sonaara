import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { getFriendIds, setFriendIds } from "@/lib/store";

export async function GET() {
  const session = await getSession();
  if (!session.userId) return NextResponse.json({ ids: [] });
  const ids = await getFriendIds(session.userId);
  return NextResponse.json({ ids });
}

export async function PUT(request: NextRequest) {
  const session = await getSession();
  if (!session.userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { ids } = await request.json() as { ids: string[] };
  if (!Array.isArray(ids)) return NextResponse.json({ error: "Invalid" }, { status: 400 });
  await setFriendIds(session.userId, ids);
  return NextResponse.json({ ok: true });
}
