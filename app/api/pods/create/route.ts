import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { savePod } from "@/lib/pods";
import type { Pod } from "@/types";

function nanoid(length = 8): string {
  const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
  let id = "";
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  for (const b of bytes) id += chars[b % chars.length];
  return id;
}

async function triggerGitHubWorkflow(inputs: Record<string, string>) {
  const owner = process.env.GITHUB_OWNER!;
  const repo = process.env.GITHUB_REPO!;
  const token = process.env.GITHUB_TOKEN!;
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://sonaara.vercel.app";

  const res = await fetch(
    `https://api.github.com/repos/${owner}/${repo}/actions/workflows/create-spotify-app.yml/dispatches`,
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
        inputs: { ...inputs, webhookUrl: appUrl },
      }),
    }
  );

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`GitHub API error ${res.status}: ${text}`);
  }
}

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session.userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json() as {
    podName: string;
    email: string;
    password: string;
    twoFactorCode?: string;
  };

  const { podName, email, password, twoFactorCode } = body;
  if (!podName?.trim() || !email?.trim() || !password) {
    return NextResponse.json({ error: "podName, email, and password are required" }, { status: 400 });
  }

  const podId = nanoid(8);

  const pod: Pod = {
    podId,
    podName: podName.trim(),
    adminUserId: session.userId,
    clientId: "",
    clientSecretEncrypted: "",
    spotifyAppId: "",
    sessionCookiesEncrypted: "",
    memberIds: [session.userId],
    status: "pending",
    createdAt: new Date().toISOString(),
  };

  await savePod(pod);

  await triggerGitHubWorkflow({
    podId,
    podName: podName.trim(),
    email,
    password,
    twoFactorCode: twoFactorCode ?? "",
  });

  return NextResponse.json({ podId, status: "pending" });
}
