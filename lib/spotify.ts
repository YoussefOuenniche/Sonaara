import type { Track, AudioFeatures, TrackWithGenres, AggregatedAudioFeatures, DiscoverTrack } from "@/types";

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

// Format a Date as YYYY-MM-DD in the given IANA timezone (en-CA gives that format natively)
function dateStringInTz(date: Date, tz: string): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: tz,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

// Return a YYYY-MM-DD key for N days ago in the given timezone (defaults to UTC)
export function getDayKey(daysAgo: number, tz = "UTC"): string {
  const todayStr = dateStringInTz(new Date(), tz);
  const [y, m, d] = todayStr.split("-").map(Number);
  const target = new Date(y, m - 1, d - daysAgo);
  return `${target.getFullYear()}-${String(target.getMonth() + 1).padStart(2, "0")}-${String(target.getDate()).padStart(2, "0")}`;
}

const MIN_PLAY_MS = 30_000; // skip tracks where the next one started within 30 s

/**
 * Filter recently-played items by estimated play duration.
 * Items are sorted ascending by played_at; any track whose successor started
 * within MIN_PLAY_MS is considered skipped and removed.
 * The last track in the list always passes (no successor to compare against).
 */
function filterByPlayDuration(items: RawTrackItem[]): RawTrackItem[] {
  if (items.length <= 1) return items;
  const sorted = [...items].sort(
    (a, b) => new Date(a.played_at).getTime() - new Date(b.played_at).getTime()
  );
  return sorted.filter((item, i) => {
    const next = sorted[i + 1];
    if (!next) return true;
    const gap = new Date(next.played_at).getTime() - new Date(item.played_at).getTime();
    return gap >= MIN_PLAY_MS;
  });
}

// Fetch the 50 most recent played items and group them by YYYY-MM-DD key in the given timezone.
export async function getRecentTracksGrouped(
  accessToken: string,
  tz = "UTC"
): Promise<Record<string, Track[]>> {
  const data = await spotifyFetch(
    "/me/player/recently-played?limit=50",
    accessToken
  ).catch(() => null);
  if (!data?.items?.length) return {};

  const grouped: Record<string, Track[]> = {};
  for (const item of filterByPlayDuration(data.items as RawTrackItem[])) {
    const key = dateStringInTz(new Date(item.played_at), tz);
    if (!grouped[key]) grouped[key] = [];
    grouped[key].push(rawItemToTrack(item));
  }
  return grouped;
}

// Get all tracks played yesterday, filtered by the user's timezone
export async function getYesterdayTracks(accessToken: string, tz = "UTC"): Promise<Track[]> {
  const yesterdayKey = getDayKey(1, tz);

  const data = await spotifyFetch(
    "/me/player/recently-played?limit=50",
    accessToken
  );

  if (!data.items?.length) return [];

  const yesterdayItems = (data.items as RawTrackItem[]).filter(
    (item) => dateStringInTz(new Date(item.played_at), tz) === yesterdayKey
  );
  return filterByPlayDuration(yesterdayItems).map(rawItemToTrack);
}

// Get genres for a list of artist IDs (batched, max 50 per request)
export async function getArtistGenres(
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

// Batch-fetch preview URLs for a list of track IDs — all chunks in parallel
export async function getTrackPreviews(
  trackIds: string[],
  accessToken: string
): Promise<Map<string, string | null>> {
  const chunks: string[][] = [];
  for (let i = 0; i < trackIds.length; i += 50) chunks.push(trackIds.slice(i, i + 50));

  const results = await Promise.all(
    chunks.map((chunk) =>
      spotifyFetch(`/tracks?ids=${chunk.join(",")}`, accessToken).catch(() => null) as Promise<{
        tracks: Array<{ id: string; preview_url: string | null } | null>;
      } | null>
    )
  );

  const previewMap = new Map<string, string | null>();
  for (const data of results) {
    if (data?.tracks) {
      for (const t of data.tracks) {
        if (t?.id) previewMap.set(t.id, t.preview_url ?? null);
      }
    }
  }
  return previewMap;
}

// Fetch all of the user's liked songs with genre tags
export async function getLikedTracks(accessToken: string): Promise<DiscoverTrack[]> {
  type RawSavedItem = {
    track: {
      id: string;
      name: string;
      uri: string;
      preview_url: string | null;
      artists: { id: string; name: string }[];
      album: { name: string; images: { url: string }[] };
    };
  };

  const raw: { artistIds: string[]; track: DiscoverTrack }[] = [];
  let nextPath: string | null = "/me/tracks?limit=50";

  while (nextPath) {
    const data = await spotifyFetch(nextPath, accessToken).catch(() => null) as {
      items: RawSavedItem[];
      next: string | null;
    } | null;
    if (!data?.items) break;

    for (const item of data.items) {
      const t = item.track;
      if (!t?.id) continue;
      raw.push({
        artistIds: t.artists.map((a) => a.id),
        track: {
          id: t.id,
          name: t.name,
          artists: t.artists.map((a) => a.name),
          artistIds: t.artists.map((a) => a.id),
          albumName: t.album?.name ?? "",
          albumImageUrl: t.album?.images?.[0]?.url ?? "",
          genres: [],
          uri: t.uri,
          previewUrl: t.preview_url ?? null,
          likedByUserIds: [],
          likedByNames: [],
        },
      });
    }
    nextPath = data.next ? data.next.replace(SPOTIFY_BASE, "") : null;
  }

  // Batch-fetch genres for all unique artist IDs
  const allArtistIds = [...new Set(raw.flatMap((r) => r.artistIds))];
  const genreMap = await getArtistGenres(allArtistIds, accessToken).catch(() => ({} as Record<string, string[]>));

  return raw.map(({ artistIds, track }) => ({
    ...track,
    genres: [...new Set(artistIds.flatMap((id) => genreMap[id] ?? []))],
  }));
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
