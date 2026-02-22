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
  albumName: string;
  albumImageUrl: string;
  genres: string[];
  uri: string; // spotify:track:...
  likedByUserIds: string[]; // which friends liked this
}

export interface AggregatedAudioFeatures {
  avgValence: number;
  avgEnergy: number;
  avgDanceability: number;
  avgAcousticness: number;
  avgTempo: number;
}
