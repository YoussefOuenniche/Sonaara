import { NextRequest, NextResponse } from "next/server";
import { getPod } from "@/lib/pods";

const SCOPES = [
  "user-read-recently-played",
  "user-read-email",
  "user-read-private",
  "user-library-read",
  "user-library-modify",
  "streaming",
].join(" ");

export async function GET(request: NextRequest) {
  const podId = request.nextUrl.searchParams.get("pod") ?? "";

  let clientId = process.env.SPOTIFY_CLIENT_ID!;
  if (podId) {
    const pod = await getPod(podId).catch(() => null);
    if (pod?.status === "ready") {
      clientId = pod.clientId;
    }
  }

  // Encode podId in the state param so the callback knows which pod to use
  const state = podId ? `pod:${podId}` : "default";

  const params = new URLSearchParams({
    client_id: clientId,
    response_type: "code",
    redirect_uri: process.env.SPOTIFY_REDIRECT_URI!,
    scope: SCOPES,
    state,
  });

  return NextResponse.redirect(
    `https://accounts.spotify.com/authorize?${params.toString()}`
  );
}
