import { NextResponse } from "next/server";
const SCOPES = [
  "user-read-recently-played",
  "user-read-email",
  "user-read-private",
  "user-library-read",
  "user-library-modify",
  "streaming",
].join(" ");

export async function GET() {
  const params = new URLSearchParams({
    client_id: process.env.SPOTIFY_CLIENT_ID!,
    response_type: "code",
    redirect_uri: process.env.SPOTIFY_REDIRECT_URI!,
    scope: SCOPES,
  });

  return NextResponse.redirect(
    `https://accounts.spotify.com/authorize?${params.toString()}`
  );
}
