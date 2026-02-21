import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { getUsers } from "@/lib/store";

export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session.accessToken) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const raw = request.nextUrl.searchParams.get("ids") ?? "";
  const ids = raw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(0, 10);

  const users = await getUsers(ids);
  return NextResponse.json({ users });
}
