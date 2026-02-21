import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const code = searchParams.get("code");
  const error = searchParams.get("error");

  if (error || !code) {
    return NextResponse.redirect(new URL("/?error=access_denied", request.url));
  }

  // Exchange code for tokens
  const tokenRes = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      code,
      redirect_uri: process.env.SPOTIFY_REDIRECT_URI!,
      client_id: process.env.SPOTIFY_CLIENT_ID!,
      client_secret: process.env.SPOTIFY_CLIENT_SECRET!,
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
  await session.save();

  // Use meta-refresh so the Set-Cookie header lands on this response
  // before the browser navigates — a plain redirect loses the cookie.
  return new NextResponse(
    `<!doctype html><html><head>
      <meta http-equiv="refresh" content="0; url=/dashboard">
    </head><body></body></html>`,
    { headers: { "Content-Type": "text/html" } }
  );
}
