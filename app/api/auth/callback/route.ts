import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { addToUserIndex, storeUserRefreshToken } from "@/lib/store";
import { getPod, addPodMember, addPendingEmail, storeJoinEmailUserId } from "@/lib/pods";
import { decrypt } from "@/lib/encryption";

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const code = searchParams.get("code");
  const error = searchParams.get("error");

  if (error || !code) {
    return NextResponse.redirect(new URL("/?error=access_denied", request.url));
  }

  // Decode routing info from the state param (set by /api/auth/login)
  const state = searchParams.get("state") ?? "";
  const podId = state.startsWith("pod:") ? state.slice(4) : null;
  const nextPath = state.startsWith("next:") ? state.slice(5) : null;
  const joinPodId = state.startsWith("join:") ? state.slice(5) : null;

  // Resolve credentials: pod credentials if pod login, else default app credentials
  let clientId = process.env.SPOTIFY_CLIENT_ID!;
  let clientSecret = process.env.SPOTIFY_CLIENT_SECRET!;
  let pod = null;

  if (podId) {
    pod = await getPod(podId).catch(() => null);
    if (pod?.status === "ready" && pod.clientId) {
      clientId = pod.clientId;
      clientSecret = decrypt(pod.clientSecretEncrypted);
    }
  }

  // Exchange code for tokens
  const tokenRes = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      code,
      redirect_uri: process.env.SPOTIFY_REDIRECT_URI!,
      client_id: clientId,
      client_secret: clientSecret,
    }),
  });

  if (!tokenRes.ok) {
    return NextResponse.redirect(new URL("/?error=token_exchange", request.url));
  }

  const tokens = await tokenRes.json();

  // Fetch user profile
  const profileRes = await fetch("https://api.spotify.com/v1/me", {
    headers: { Authorization: `Bearer ${tokens.access_token}` },
  });
  const profile = profileRes.ok ? await profileRes.json() : {};

  // Save session via cookies() — this writes Set-Cookie onto whatever response we return
  const session = await getSession();
  session.accessToken = tokens.access_token;
  session.refreshToken = tokens.refresh_token;
  session.expiresAt = Math.floor(Date.now() / 1000) + tokens.expires_in;
  session.userId = profile.id ?? null;
  session.userName = profile.display_name ?? profile.id ?? "there";
  session.userImage = profile.images?.[0]?.url ?? null;
  session.userEmail = profile.email ?? null;
  if (podId && pod) session.podId = podId;
  await session.save();

  // Persist refresh token + add user to global index so the daily cron can reach them
  if (profile.id && tokens.refresh_token) {
    await Promise.all([
      addToUserIndex(profile.id),
      storeUserRefreshToken(profile.id, tokens.refresh_token),
    ]).catch(() => {});
  }

  // Add user to pod member list (full pod login)
  if (podId && pod && profile.id) {
    await addPodMember(podId, profile.id).catch(() => {});
  }

  // Join intent: auto-add email to pending list, redirect back to join page
  if (joinPodId && profile.email) {
    await Promise.all([
      addPendingEmail(joinPodId, profile.email.toLowerCase()),
      storeJoinEmailUserId(joinPodId, profile.email.toLowerCase(), profile.id),
    ]).catch(() => {});
  }

  // Use meta-refresh so the Set-Cookie header lands on this response
  // before the browser navigates — a plain redirect loses the cookie.
  const destination = nextPath ? `/${nextPath}` : joinPodId ? `/join/${joinPodId}?pending=1` : "/dashboard";
  return new NextResponse(
    `<!doctype html><html><head>
      <meta http-equiv="refresh" content="0; url=${destination}">
    </head><body></body></html>`,
    { headers: { "Content-Type": "text/html" } }
  );
}
