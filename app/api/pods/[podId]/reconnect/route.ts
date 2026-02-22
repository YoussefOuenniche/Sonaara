import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { getPod, setUserPodId } from "@/lib/pods";

// Visiting /api/pods/{podId}/reconnect writes the user→pod mapping and
// updates session.podId so the dashboard shows the correct pod section.
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ podId: string }> }
) {
  const { podId } = await params;
  const session = await getSession();

  if (!session.userId) {
    return NextResponse.redirect(new URL(`/api/auth/login?next=api/pods/${podId}/reconnect`, request.url));
  }

  const pod = await getPod(podId).catch(() => null);
  if (!pod || pod.status !== "ready") {
    return NextResponse.redirect(new URL("/?error=pod_not_found", request.url));
  }

  // Only members of this pod can reconnect
  if (!pod.memberIds.includes(session.userId)) {
    return NextResponse.redirect(new URL("/?error=not_a_member", request.url));
  }

  await setUserPodId(session.userId, podId);
  session.podId = podId;
  await session.save();

  return NextResponse.redirect(new URL("/dashboard", request.url));
}
