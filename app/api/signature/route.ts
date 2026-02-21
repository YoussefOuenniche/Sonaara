import { NextResponse } from "next/server";
import { getAccessToken } from "@/lib/session";
import { generateSignature } from "@/lib/claude";
import {
  getYesterdayTracks,
  getYesterdayTracksWithGenres,
  getAudioFeatures,
  aggregateAudioFeatures,
} from "@/lib/spotify";

export async function GET() {
  const accessToken = await getAccessToken();

  if (!accessToken) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const rawTracks = await getYesterdayTracks(accessToken);

  if (!rawTracks.length) {
    return NextResponse.json({ noData: true });
  }

  const [tracksWithGenres, audioFeaturesRaw] = await Promise.all([
    getYesterdayTracksWithGenres(rawTracks, accessToken),
    getAudioFeatures(rawTracks.map((t) => t.id), accessToken).catch(() => []),
  ]);

  const audioFeatures = aggregateAudioFeatures(audioFeaturesRaw);
  const signature = await generateSignature(tracksWithGenres, audioFeatures);

  return NextResponse.json({ signature, trackCount: rawTracks.length });
}
