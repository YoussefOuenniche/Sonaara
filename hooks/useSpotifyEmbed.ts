"use client";

import { useEffect, useRef, useState } from "react";

// Silent WAV played through a dedicated element during the "Go" button tap
// so iOS permanently unlocks audio for this page. The main player element
// is never touched during unlock, so there are no src-race conditions.
const UNLOCK_SRC =
  "data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQAAAAA=";

export function useAudioPlayer() {
  const audioRef  = useRef<HTMLAudioElement | null>(null);
  const unlockRef = useRef<HTMLAudioElement | null>(null);
  // Ref mirrors state so togglePlay always reads the latest value even when
  // React hasn't flushed the re-render yet (avoids stale-closure on mobile).
  const isPlayingRef = useRef(false);
  const [isPlaying, setIsPlaying] = useState(false);

  function setPlaying(v: boolean) {
    isPlayingRef.current = v;
    setIsPlaying(v);
  }

  useEffect(() => {
    const audio  = new Audio();
    const unlock = new Audio(UNLOCK_SRC);
    unlock.volume = 0;

    audioRef.current  = audio;
    unlockRef.current = unlock;

    const onPlaying = () => setPlaying(true);
    const onPause   = () => setPlaying(false);
    const onEnded   = () => setPlaying(false);

    audio.addEventListener("playing", onPlaying);
    audio.addEventListener("pause",   onPause);
    audio.addEventListener("ended",   onEnded);

    return () => {
      audio.removeEventListener("playing", onPlaying);
      audio.removeEventListener("pause",   onPause);
      audio.removeEventListener("ended",   onEnded);
      audio.pause();
      audio.src     = "";
      audioRef.current  = null;
      unlockRef.current = null;
    };
  }, []);

  /** Load a preview URL and begin playback. Null = no preview available, no-op. */
  function loadAndPlay(previewUrl: string | null) {
    const audio = audioRef.current;
    if (!audio || !previewUrl) return;
    audio.src = previewUrl;
    audio.play().catch(() => {});
  }

  function pause() {
    audioRef.current?.pause();
  }

  function togglePlay() {
    const audio = audioRef.current;
    if (!audio) return;
    if (isPlayingRef.current) audio.pause();
    else audio.play().catch(() => {});
  }

  /**
   * Call synchronously inside a user-gesture handler (e.g. the "Go" button tap)
   * before any async work begins. Plays a zero-volume silent clip to permanently
   * unlock this page's audio on iOS — all subsequent play() calls then succeed
   * from any context (useEffect, setTimeout, etc.).
   */
  function prime() {
    unlockRef.current?.play().then(() => unlockRef.current?.pause()).catch(() => {});
  }

  return { isPlaying, loadAndPlay, pause, togglePlay, prime };
}
