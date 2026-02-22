import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { getPod, getPendingEmails } from "@/lib/pods";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ podId: string }> }
) {
  const session = await getSession();
  if (!session.userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { podId } = await params;
  const pod = await getPod(podId);

  if (!pod) {
    return NextResponse.json({ error: "Pod not found" }, { status: 404 });
  }
  if (pod.adminUserId !== session.userId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const emails = await getPendingEmails(podId);
  return NextResponse.json({ emails });
}
