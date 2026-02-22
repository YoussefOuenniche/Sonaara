import { NextRequest, NextResponse } from "next/server";
import { getPod } from "@/lib/pods";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ podId: string }> }
) {
  const { podId } = await params;
  const pod = await getPod(podId);

  if (!pod) {
    return NextResponse.json({ error: "Pod not found" }, { status: 404 });
  }

  return NextResponse.json({
    status: pod.status,
    podName: pod.podName,
    errorMessage: pod.errorMessage,
  });
}
