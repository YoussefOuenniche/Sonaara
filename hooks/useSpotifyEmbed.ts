"use client";

import { useEffect, useRef, useState } from "react";

// A 0-sample silent WAV — no sound at any volume, but playing it via a
// user gesture permanently activates this audio element on iOS so all
// subsequent play() calls succeed from any async context.
const UNLOCK_SRC =
  "data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQAAAAA=";

export function useAudioPlayer() {
  const audioRef    = useRef<HTMLAudioElement | null>(null);
  const isPlayingRef = useRef(false);
  const [isPlaying, setIsPlaying] = useState(false);

  function setPlaying(v: boolean) {
    isPlayingRef.current = v;
    setIsPlaying(v);
  }

  useEffect(() => {
    const audio = new Audio();
    audioRef.current = audio;

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
      audioRef.current = null;
    };
  }, []);

  /** Replace the current track and start playing. Null = no preview, no-op. */
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
   * Call synchronously inside a user-gesture handler before any async work.
   * Sets the silent src and plays it to activate THIS element on iOS — the
   * same element loadAndPlay() will later use. iOS activation is per-element,
   * so a separate "activator" element does not unlock this one.
   * The silent WAV has 0 audio samples so nothing is ever heard.
   */
  function prime() {
    const audio = audioRef.current;
    if (!audio) return;
    audio.src = UNLOCK_SRC;
    audio.play().catch(() => {});
  }

  return { isPlaying, loadAndPlay, pause, togglePlay, prime };
}
