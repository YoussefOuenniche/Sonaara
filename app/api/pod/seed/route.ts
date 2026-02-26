/**
 * One-time endpoint to seed the pod in Redis.
 * GET /api/pod/seed — admin-only, safe to call multiple times (no-op if already exists).
 */
import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { getPod, savePod } from "@/lib/pods";
import type { Pod } from "@/types";

export async function GET() {
  const session = await getSession();
  if (!session.userId || session.userId !== process.env.ADMIN_USER_ID) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const podId = process.env.POD_ID ?? "main";
  const existing = await getPod(podId);
  if (existing) {
    return NextResponse.json({ status: "already_exists", pod: existing });
  }

  const pod: Pod = {
    podId,
    podName: process.env.POD_NAME ?? "YO's Crew",
    adminUserId: process.env.ADMIN_USER_ID!,
    memberIds: [process.env.ADMIN_USER_ID!], // admin is always a member
    pendingRequests: [],
    spotifyAppId: process.env.SPOTIFY_APP_ID ?? "",
    devPortalSessionEncrypted: null,
    devPortalSessionExpiresAt: null,
    createdAt: new Date().toISOString(),
  };

  await savePod(pod);
  return NextResponse.json({ status: "created", pod });
}
