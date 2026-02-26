import { getIronSession, IronSession } from "iron-session";
import { cookies } from "next/headers";

export interface SessionData {
  accessToken?: string;
  refreshToken?: string;
  expiresAt?: number; // unix seconds
  userName?: string;
  userImage?: string;
  userId?: string;
  podId?: string; // set when the user is a pod member
}

export const sessionOptions = {
  password: process.env.SESSION_SECRET!,
  cookieName: "sonaara_session",
  cookieOptions: {
    secure: process.env.NODE_ENV === "production",
    httpOnly: true,
    sameSite: "lax" as const,
    maxAge: 60 * 60 * 24 * 30, // 30 days
  },
};

export async function getSession(): Promise<IronSession<SessionData>> {
  const cookieStore = await cookies();
  return getIronSession<SessionData>(cookieStore, sessionOptions);
}

export async function getAccessToken(): Promise<string | null> {
  const session = await getSession();
  if (!session.accessToken) return null;

  // Refresh if expired (with 60s buffer)
  if (session.expiresAt && Date.now() / 1000 > session.expiresAt - 60) {
    return refreshToken(session);
  }

  return session.accessToken;
}

async function refreshToken(session: IronSession<SessionData>): Promise<string | null> {
  if (!session.refreshToken) return null;

  try {
    const res = await fetch("https://accounts.spotify.com/api/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "refresh_token",
        refresh_token: session.refreshToken,
        client_id: process.env.SPOTIFY_CLIENT_ID!,
        client_secret: process.env.SPOTIFY_CLIENT_SECRET!,
      }),
    });

    if (!res.ok) return null;

    const data = await res.json();
    session.accessToken = data.access_token;
    session.expiresAt = Math.floor(Date.now() / 1000) + data.expires_in;
    if (data.refresh_token) {
      session.refreshToken = data.refresh_token;
      // Keep Redis in sync when Spotify rotates the refresh token
      if (session.userId) {
        const { storeUserRefreshToken } = await import("@/lib/store");
        storeUserRefreshToken(session.userId, data.refresh_token).catch(() => {});
      }
    }
    await session.save();

    return session.accessToken!;
  } catch {
    return null;
  }
}
