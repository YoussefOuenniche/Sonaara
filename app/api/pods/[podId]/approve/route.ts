import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { getPod, getPendingEmails, clearPendingEmails, addPodMember, getJoinEmailUserId } from "@/lib/pods";

async function triggerAllowlistWorkflow(podId: string, emails: string[]) {
  const owner = process.env.GITHUB_OWNER!;
  const repo = process.env.GITHUB_REPO!;
  const token = process.env.GITHUB_TOKEN!;
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://sonaara.vercel.app";

  const res = await fetch(
    `https://api.github.com/repos/${owner}/${repo}/actions/workflows/add-allowlist-users.yml/dispatches`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        ref: "feature/pod-system",
        inputs: { podId, emails: emails.join(","), webhookUrl: appUrl },
      }),
    }
  );

  if (!res.ok) throw new Error(`GitHub API error ${res.status}`);
}

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ podId: string }> }
) {
  const session = await getSession();
  if (!session.userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { podId } = await params;
  const pod = await getPod(podId);

  if (!pod) return NextResponse.json({ error: "Pod not found" }, { status: 404 });
  if (pod.adminUserId !== session.userId) {
    return NextResponse.json({ error: "Only the pod admin can approve members" }, { status: 403 });
  }

  const pendingEmails = await getPendingEmails(podId);
  if (!pendingEmails.length) {
    return NextResponse.json({ ok: true, emailsQueued: 0, message: "No pending emails" });
  }

  // Look up Spotify userIds stored at join time and add them to pod members directly
  const userIdLookups = await Promise.all(
    pendingEmails.map((email) => getJoinEmailUserId(podId, email).catch(() => null))
  );
  await Promise.all(
    userIdLookups
      .filter((uid): uid is string => !!uid)
      .map((uid) => addPodMember(podId, uid).catch(() => {}))
  );

  // Clear pending list so dashboard updates immediately
  await clearPendingEmails(podId);

  // Fire-and-forget: also trigger Spotify allowlist workflow for production pods
  if (pod.clientId) {
    triggerAllowlistWorkflow(podId, pendingEmails).catch(() => {});
  }

  return NextResponse.json({ ok: true, emailsQueued: pendingEmails.length });
}
