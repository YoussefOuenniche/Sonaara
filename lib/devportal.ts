/**
 * Spotify Developer Portal automation via GitHub Actions + Playwright.
 *
 * Flow:
 *  1. triggerAllowlistUpdate()  →  dispatches a GitHub Actions workflow
 *  2. Playwright runs on ubuntu-latest, logs into developer.spotify.com,
 *     manages the allowlist, then POSTs back to /api/pod/allowlist-result
 *  3. triggerSessionCapture()  →  dispatches the session-capture workflow
 *     (run once + auto-triggered when allowlist calls fail with 401)
 */

const GITHUB_API = "https://api.github.com";

function githubHeaders() {
  return {
    Authorization: `Bearer ${process.env.GITHUB_TOKEN}`,
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
    "Content-Type": "application/json",
  };
}

async function dispatchWorkflow(workflow: string, inputs: Record<string, string>) {
  const owner = process.env.GITHUB_OWNER!;
  const repo = process.env.GITHUB_REPO!;
  const ref = process.env.GITHUB_BRANCH ?? "feature/music-pod";

  const res = await fetch(
    `${GITHUB_API}/repos/${owner}/${repo}/actions/workflows/${workflow}/dispatches`,
    {
      method: "POST",
      headers: githubHeaders(),
      body: JSON.stringify({ ref, inputs }),
    }
  );

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`GitHub workflow dispatch failed (${res.status}): ${text}`);
  }
}

/** Trigger Playwright to add or remove a user from the Spotify allowlist. */
export async function triggerAllowlistUpdate(opts: {
  action: "add" | "remove";
  email: string;
  podId: string;
  webhookUrl: string;
}) {
  await dispatchWorkflow("manage-allowlist.yml", {
    action: opts.action,
    email: opts.email,
    pod_id: opts.podId,
    webhook_url: opts.webhookUrl,
  });
}

/** Trigger Playwright to log in and capture a fresh dev portal session. */
export async function triggerSessionCapture(opts: {
  podId: string;
  webhookUrl: string;
}) {
  await dispatchWorkflow("capture-portal-session.yml", {
    pod_id: opts.podId,
    webhook_url: opts.webhookUrl,
  });
}
