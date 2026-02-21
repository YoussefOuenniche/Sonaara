import type { Track, AudioFeatures, TrackWithGenres, AggregatedAudioFeatures } from "@/types";

const SPOTIFY_BASE = "https://api.spotify.com/v1";

async function spotifyFetch(path: string, accessToken: string) {
  const res = await fetch(`${SPOTIFY_BASE}${path}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
    next: { revalidate: 0 },
  });
  if (!res.ok) {
    const error = await res.text();
    throw new Error(`Spotify API error ${res.status}: ${error}`);
  }
  return res.json();
}

type RawArtist = { id: string; name: string };
type RawTrackItem = {
  track: {
    id: string;
    name: string;
    artists: RawArtist[];
    album: { name: string; images: { url: string }[] };
    preview_url: string | null;
  };
  played_at: string;
};

function rawItemToTrack(item: RawTrackItem): Track {
  return {
    id: item.track.id,
    name: item.track.name,
    artists: item.track.artists.map((a) => a.name),
    artistIds: item.track.artists.map((a) => a.id),
    albumName: item.track.album.name,
    albumImageUrl: item.track.album.images?.[0]?.url ?? "",
    playedAt: item.played_at,
    previewUrl: item.track.preview_url,
  };
}

// Get the single most recently played track
export async function getLastPlayedTrack(accessToken: string): Promise<Track | null> {
  const data = await spotifyFetch("/me/player/recently-played?limit=1", accessToken);
  const item = data.items?.[0];
  if (!item) return null;
  return rawItemToTrack(item);
}

// Convert a "YYYY-MM-DD" key to a local-midnight timestamp range
function dayKeyToWindow(key: string): { start: number; end: number } {
  const [y, m, d] = key.split("-").map(Number);
  const start = new Date(y, m - 1, d, 0, 0, 0, 0).getTime();
  const end   = new Date(y, m - 1, d + 1, 0, 0, 0, 0).getTime() - 1;
  return { start, end };
}

// Return a YYYY-MM-DD key for N days ago
export function getDayKey(daysAgo: number): string {
  const now = new Date();
  const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - daysAgo);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

// Fetch the 50 most recent played items and group them by YYYY-MM-DD key.
// One API call, covers as many days as those 50 items span.
export async function getRecentTracksGrouped(
  accessToken: string
): Promise<Record<string, Track[]>> {
  const data = await spotifyFetch(
    "/me/player/recently-played?limit=50",
    accessToken
  ).catch(() => null);
  if (!data?.items?.length) return {};

  const grouped: Record<string, Track[]> = {};
  for (const item of data.items as RawTrackItem[]) {
    const d = new Date(item.played_at);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    if (!grouped[key]) grouped[key] = [];
    grouped[key].push(rawItemToTrack(item));
  }
  return grouped;
}

// Get window for "yesterday" (local midnight to midnight)
export function getYesterdayWindow(): { start: number; end: number } {
  const now = new Date();
  const todayMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
  const yesterdayMidnight = new Date(todayMidnight.getTime() - 86400000);
  return {
    start: yesterdayMidnight.getTime(),
    end: todayMidnight.getTime() - 1,
  };
}

// Get all tracks played yesterday (up to 50 due to Spotify API limit)
export async function getYesterdayTracks(accessToken: string): Promise<Track[]> {
  const { start, end } = getYesterdayWindow();

  const data = await spotifyFetch(
    `/me/player/recently-played?limit=50&after=${start}`,
    accessToken
  );

  if (!data.items?.length) return [];

  return (data.items as RawTrackItem[])
    .filter((item) => {
      const playedAt = new Date(item.played_at).getTime();
      return playedAt >= start && playedAt <= end;
    })
    .map(rawItemToTrack);
}

// Get genres for a list of artist IDs (batched, max 50 per request)
async function getArtistGenres(
  artistIds: string[],
  accessToken: string
): Promise<Record<string, string[]>> {
  if (!artistIds.length) return {};

  const chunks: string[][] = [];
  for (let i = 0; i < artistIds.length; i += 50) {
    chunks.push(artistIds.slice(i, i + 50));
  }

  const genreMap: Record<string, string[]> = {};
  for (const chunk of chunks) {
    const data = await spotifyFetch(`/artists?ids=${chunk.join(",")}`, accessToken);
    for (const artist of data.artists ?? []) {
      genreMap[artist.id] = artist.genres ?? [];
    }
  }
  return genreMap;
}

// Get audio features for a list of track IDs (deprecated for new apps — caller should .catch(() => []))
export async function getAudioFeatures(
  trackIds: string[],
  accessToken: string
): Promise<AudioFeatures[]> {
  if (!trackIds.length) return [];

  const chunks: string[][] = [];
  for (let i = 0; i < trackIds.length; i += 100) {
    chunks.push(trackIds.slice(i, i + 100));
  }

  const features: AudioFeatures[] = [];
  for (const chunk of chunks) {
    const data = await spotifyFetch(`/audio-features?ids=${chunk.join(",")}`, accessToken);
    for (const f of data.audio_features ?? []) {
      if (f) {
        features.push({
          id: f.id,
          valence: f.valence,
          energy: f.energy,
          danceability: f.danceability,
          acousticness: f.acousticness,
          tempo: f.tempo,
        });
      }
    }
  }
  return features;
}

// Enrich tracks with genre data — uses artistIds already on each Track (no extra API call)
export async function getYesterdayTracksWithGenres(
  tracks: Track[],
  accessToken: string
): Promise<TrackWithGenres[]> {
  if (!tracks.length) return [];

  const allArtistIds = [...new Set(tracks.flatMap((t) => t.artistIds))];
  const genreMap = await getArtistGenres(allArtistIds, accessToken);

  return tracks.map((track) => ({
    ...track,
    genres: [...new Set(track.artistIds.flatMap((id) => genreMap[id] ?? []))],
  }));
}

// Aggregate audio features into averages
export function aggregateAudioFeatures(
  features: AudioFeatures[]
): AggregatedAudioFeatures | null {
  if (!features.length) return null;

  const sum = features.reduce(
    (acc, f) => ({
      valence: acc.valence + f.valence,
      energy: acc.energy + f.energy,
      danceability: acc.danceability + f.danceability,
      acousticness: acc.acousticness + f.acousticness,
      tempo: acc.tempo + f.tempo,
    }),
    { valence: 0, energy: 0, danceability: 0, acousticness: 0, tempo: 0 }
  );

  const count = features.length;
  return {
    avgValence: sum.valence / count,
    avgEnergy: sum.energy / count,
    avgDanceability: sum.danceability / count,
    avgAcousticness: sum.acousticness / count,
    avgTempo: sum.tempo / count,
  };
}

// Format relative time (e.g. "2 hours ago")
export function formatRelativeTime(isoTimestamp: string): string {
  const played = new Date(isoTimestamp).getTime();
  const now = Date.now();
  const diffMs = now - played;
  const diffMins = Math.floor(diffMs / 60000);

  if (diffMins < 1) return "just now";
  if (diffMins < 60) return `${diffMins} minute${diffMins === 1 ? "" : "s"} ago`;

  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours} hour${diffHours === 1 ? "" : "s"} ago`;

  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays} day${diffDays === 1 ? "" : "s"} ago`;
}
