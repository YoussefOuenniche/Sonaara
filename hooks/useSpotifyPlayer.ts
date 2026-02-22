"use client";

import { useEffect, useRef, useState } from "react";

declare global {
  interface Window {
    Spotify: {
      Player: new (options: {
        name: string;
        getOAuthToken: (cb: (token: string) => void) => void;
        volume: number;
      }) => SpotifyPlayer;
    };
    onSpotifyWebPlaybackSDKReady: () => void;
  }
}

interface SpotifyPlayer {
  connect: () => Promise<boolean>;
  disconnect: () => void;
  togglePlay: () => Promise<void>;
  pause: () => Promise<void>;
  resume: () => Promise<void>;
  addListener: (event: string, cb: (data: unknown) => void) => void;
  removeListener: (event: string) => void;
}

export interface PlayerState {
  deviceId: string | null;
  isPlaying: boolean;
  isReady: boolean;
  error: string | null;
}

export function useSpotifyPlayer(accessToken: string | null) {
  const playerRef = useRef<SpotifyPlayer | null>(null);
  const [state, setState] = useState<PlayerState>({
    deviceId: null,
    isPlaying: false,
    isReady: false,
    error: null,
  });

  useEffect(() => {
    if (!accessToken) return;

    // Load SDK script if not already loaded
    if (!document.getElementById("spotify-sdk")) {
      const script = document.createElement("script");
      script.id = "spotify-sdk";
      script.src = "https://sdk.scdn.co/spotify-player.js";
      script.async = true;
      document.body.appendChild(script);
    }

    const initPlayer = () => {
      const player = new window.Spotify.Player({
        name: "Sonaara Discover",
        getOAuthToken: (cb) => cb(accessToken),
        volume: 0.8,
      });

      player.addListener("ready", (data) => {
        const { device_id } = data as { device_id: string };
        setState((s) => ({ ...s, deviceId: device_id, isReady: true, error: null }));
      });

      player.addListener("not_ready", () => {
        setState((s) => ({ ...s, isReady: false, deviceId: null }));
      });

      player.addListener("player_state_changed", (data) => {
        const ps = data as { paused: boolean } | null;
        if (ps) setState((s) => ({ ...s, isPlaying: !ps.paused }));
      });

      player.addListener("initialization_error", (data) => {
        const e = data as { message: string };
        setState((s) => ({ ...s, error: e.message }));
      });

      player.addListener("authentication_error", (data) => {
        const e = data as { message: string };
        setState((s) => ({ ...s, error: e.message }));
      });

      player.addListener("account_error", () => {
        setState((s) => ({ ...s, error: "Spotify Premium required for playback" }));
      });

      player.connect();
      playerRef.current = player;
    };

    if (window.Spotify) {
      initPlayer();
    } else {
      window.onSpotifyWebPlaybackSDKReady = initPlayer;
    }

    return () => {
      playerRef.current?.disconnect();
    };
  }, [accessToken]);

  async function playTrack(uri: string) {
    if (!state.deviceId || !accessToken) return;
    await fetch(`https://api.spotify.com/v1/me/player/play?device_id=${state.deviceId}`, {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ uris: [uri] }),
    });
    setState((s) => ({ ...s, isPlaying: true }));
  }

  async function togglePlay() {
    await playerRef.current?.togglePlay();
  }

  return { state, playTrack, togglePlay };
}
