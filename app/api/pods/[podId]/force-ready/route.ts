import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { getPod, updatePod, setUserPodId } from "@/lib/pods";

// DEV ONLY — forces a pod to "ready" without going through GitHub Actions.
// Only the pod admin can call this.
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ podId: string }> }
) {
  const { podId } = await params;
  const session = await getSession();

  if (!session.userId) {
    return NextResponse.redirect(new URL(`/api/auth/login?next=api/pods/${podId}/force-ready`, request.url));
  }

  const pod = await getPod(podId).catch(() => null);
  if (!pod) return NextResponse.json({ error: "Pod not found" }, { status: 404 });
  if (pod.adminUserId !== session.userId) {
    return NextResponse.json({ error: "Not the pod admin" }, { status: 403 });
  }

  await Promise.all([
    updatePod(podId, { status: "ready" }),
    setUserPodId(session.userId, podId),
  ]);

  session.podId = podId;
  await session.save();

  return NextResponse.redirect(new URL("/dashboard", request.url));
}
