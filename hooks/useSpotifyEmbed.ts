"use client";

import { useEffect, useRef, useState } from "react";

// Silent WAV — played via a dedicated activator element during the first user
// gesture so iOS permanently unlocks audio for this page without touching the
// main player's state or src.
const SILENT_AUDIO =
  "data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQAAAAA=";

export function useSpotifyEmbed() {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const activatorRef = useRef<HTMLAudioElement | null>(null);
  // Ref mirrors isPlaying so togglePlay always reads the latest value even
  // if React hasn't flushed the state update yet (avoids stale-closure bug).
  const isPlayingRef = useRef(false);
  const [isReady, setIsReady] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);

  function setPlayingState(v: boolean) {
    isPlayingRef.current = v;
    setIsPlaying(v);
  }

  useEffect(() => {
    const audio = new Audio();
    audioRef.current = audio;

    // Separate element used only to unlock iOS audio — never audible.
    const activator = new Audio(SILENT_AUDIO);
    activator.volume = 0;
    activatorRef.current = activator;

    setIsReady(true);

    const onPlaying = () => setPlayingState(true);
    const onPause  = () => setPlayingState(false);
    const onEnded  = () => setPlayingState(false);

    audio.addEventListener("playing", onPlaying);
    audio.addEventListener("pause",   onPause);
    audio.addEventListener("ended",   onEnded);

    return () => {
      audio.removeEventListener("playing", onPlaying);
      audio.removeEventListener("pause",   onPause);
      audio.removeEventListener("ended",   onEnded);
      audio.pause();
      audio.src = "";
      audioRef.current   = null;
      activatorRef.current = null;
      setIsReady(false);
      setPlayingState(false);
    };
  }, []);

  // Set a new preview URL and start playing.
  // A null previewUrl (track has no 30s preview) is silently ignored.
  function loadAndPlay(previewUrl: string | null) {
    const audio = audioRef.current;
    if (!audio || !previewUrl) return;
    audio.pause();
    audio.src = previewUrl;
    audio.currentTime = 0;
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

  // Call during a user gesture to unlock iOS audio for the entire page session.
  // The activator element plays a silent clip — no sound, but iOS permanently
  // marks this page as audio-activated so all subsequent play() calls succeed.
  function prime() {
    const act = activatorRef.current;
    if (!act) return;
    act.play().then(() => act.pause()).catch(() => {});
  }

  return { isReady, isPlaying, loadAndPlay, pause, togglePlay, prime };
}
