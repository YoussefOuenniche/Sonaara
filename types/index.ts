export interface Track {
  id: string;
  name: string;
  artists: string[];
  artistIds: string[];
  albumName: string;
  albumImageUrl: string;
  playedAt: string; // ISO timestamp
  previewUrl: string | null;
}

export interface AudioFeatures {
  id: string;
  valence: number;
  energy: number;
  danceability: number;
  acousticness: number;
  tempo: number;
}

export interface TrackWithGenres extends Track {
  genres: string[];
}

export interface Signature {
  genre: string;
  genreLabel: string;
  mood: string;
  moodLabel: string;
  theme: string;
  themeLabel: string;
}

export interface DiscoverTrack {
  id: string;
  name: string;
  artists: string[];
  artistIds?: string[]; // Spotify artist IDs — used to re-enrich genres when cache is stale
  albumName: string;
  albumImageUrl: string;
  genres: string[];
  uri: string; // spotify:track:...
  previewUrl: string | null;
  likedByUserIds: string[];
  likedByNames: string[]; // display names matching likedByUserIds
}

export interface AggregatedAudioFeatures {
  avgValence: number;
  avgEnergy: number;
  avgDanceability: number;
  avgAcousticness: number;
  avgTempo: number;
}

export interface PodRequest {
  userId: string;
  userName: string;
  userEmail: string;
  requestedAt: string;
  status: "pending" | "processing" | "approved" | "denied";
}

export interface Pod {
  podId: string;
  podName: string;
  adminUserId: string;
  memberIds: string[];
  pendingRequests: PodRequest[];
  spotifyAppId: string;
  devPortalSessionEncrypted: string | null;
  devPortalSessionExpiresAt: string | null;
  createdAt: string;
}
