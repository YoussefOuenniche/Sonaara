"use client";

import { useState, useEffect, useCallback } from "react";
import Image from "next/image";
import { useSpotifyPlayer } from "@/hooks/useSpotifyPlayer";
import type { DiscoverTrack } from "@/types";

const GENRES = [
  { label: "Anything", value: "anything" },
  { label: "Hip-Hop", value: "hip-hop" },
  { label: "Indie", value: "indie" },
  { label: "Electronic", value: "electronic" },
  { label: "Jazz", value: "jazz" },
  { label: "Rock", value: "rock" },
  { label: "Pop", value: "pop" },
  { label: "R&B", value: "r&b" },
  { label: "Techno", value: "techno" },
  { label: "Classical", value: "classical" },
  { label: "Country", value: "country" },
  { label: "Latin", value: "latin" },
];

const NATURE_BGS = [
  "https://media2.giphy.com/media/v1.Y2lkPTc5MGI3NjExbzBrM2R6dHVtN2NoMGZ6ZDB5dno3cXk1anMxcHZwbm53ZHdkMmRpZSZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/l0MYt5jPR6QX5pnqM/giphy.gif",
  "https://media0.giphy.com/media/v1.Y2lkPTc5MGI3NjExNzYzOGU2YnpsMGxvcXU1cHp3am94NTFwOGVydGhqcWoxeWs4cjNrNiZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/3o7btQ8jDTPGDMDqSk/giphy.gif",
  "https://media3.giphy.com/media/v1.Y2lkPTc5MGI3NjExZGd4dWZkdmFiNHJlenQxbHJtbzJqMmoxdDRmMGZsMHFzeHE5MHNwciZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/xT9IgG50Lg7rusRgqU/giphy.gif",
  "https://media1.giphy.com/media/v1.Y2lkPTc5MGI3NjExaHYxZjZweW9wYWsyYmY1bDR3cDQ3bW9nNWs0eHk0amhwbzFjeHZxZiZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/26BRzQS5HXcEWbDSo/giphy.gif",
  "https://media4.giphy.com/media/v1.Y2lkPTc5MGI3NjExNmQ3MzZhcGZxOGlxMjhiZG1paDVvMHdnbXZ4cGZkdHQ3NHp6czM2biZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/3og0INyCmHlNylks9O/giphy.gif",
  "https://media0.giphy.com/media/v1.Y2lkPTc5MGI3NjExbG93NTEzb3ZnbGdvb2Q5OTNzb2trY25odHJlNzEwdDVmc3BqNHl4aSZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/xT9IgzoKnwFNmISR8I/giphy.gif",
  "https://media2.giphy.com/media/v1.Y2lkPTc5MGI3NjExcm9zNmNxdHIzZnEybzlqNGRkcG4xaTF1aGFndHkxZTM5emN4bzZxaiZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/l0MYGb1LuZ3n7dRnO/giphy.gif",
  "https://media1.giphy.com/media/v1.Y2lkPTc5MGI3NjExNm55bHlxMDFkaWJnb3F0ajJibG80Z2E1aGowZHZlcTN4bDQ1eGl2eSZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/3ohs4xsq0oEhqnV6yk/giphy.gif",
  "https://media3.giphy.com/media/v1.Y2lkPTc5MGI3NjExc295YWlkb21vdXBhOWQ2azhzaXJtaWR4Z2pnbXdvNHUyY2VpeHo1eSZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/26xBwdIuRJiAIqHIA/giphy.gif",
  "https://media4.giphy.com/media/v1.Y2lkPTc5MGI3NjExM2NiMjdpNjQyZ3U1Z3p5dDlhM2V4bzc0NHBqd25qazM5YzZncjNuayZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/l0HlBO7eyXzSZkJri/giphy.gif",
];

type Phase = "prompt" | "cards";

export function DiscoverView({
  accessToken,
}: {
  accessToken: string;
  friendNames: Record<string, string>;
}) {
  const [phase, setPhase] = useState<Phase>("prompt");
  const [genre, setGenre] = useState("anything");
  const [pool, setPool] = useState<DiscoverTrack[]>([]);
  const [index, setIndex] = useState(0);
  const [bgIndex, setBgIndex] = useState(0);
  const [loading, setLoading] = useState(false);
  const [liking, setLiking] = useState(false);
  const [done, setDone] = useState(false);

  const { state: playerState, playTrack, togglePlay } = useSpotifyPlayer(accessToken);

  const fetchPool = useCallback(async (g: string) => {
    setLoading(true);
    setDone(false);
    setIndex(0);
    try {
      const res = await fetch(`/api/discover/pool?genre=${encodeURIComponent(g)}`);
      const json = await res.json() as { tracks: DiscoverTrack[] };
      setPool(json.tracks ?? []);
      if (!json.tracks?.length) setDone(true);
    } catch {
      setPool([]);
      setDone(true);
    } finally {
      setLoading(false);
    }
  }, []);

  const current = pool[index] ?? null;

  // Auto-play when card changes and player is ready
  useEffect(() => {
    if (current && playerState.isReady) {
      playTrack(current.uri);
      setBgIndex(Math.floor(Math.random() * NATURE_BGS.length));
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index, playerState.isReady]);

  function handleSubmit() {
    setPhase("cards");
    fetchPool(genre);
  }

  function handleChangeGenre() {
    setPhase("prompt");
    setPool([]);
    setDone(false);
    setIndex(0);
  }

  function advance() {
    if (index + 1 >= pool.length) setDone(true);
    else setIndex((i) => i + 1);
  }

  async function handleLike() {
    if (!current || liking) return;
    setLiking(true);
    await fetch("/api/discover/like", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ track: current }),
    });
    setLiking(false);
    advance();
  }

  async function handleSkip() {
    if (!current) return;
    await fetch("/api/discover/skip", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ trackId: current.id }),
    });
    advance();
  }

  const genreLabel = GENRES.find((g) => g.value === genre)?.label ?? genre;

  // ── Prompt phase ──────────────────────────────────────────────────────────
  if (phase === "prompt") {
    return (
      <div className="flex flex-col h-screen" style={{ backgroundColor: "var(--background)" }}>
        <header
          className="relative z-20 px-6 py-4 flex items-center justify-between"
          style={{ borderBottom: "1px solid rgba(196,168,240,0.1)" }}
        >
          <a href="/dashboard" className="text-white/40 hover:text-white/70 transition-colors text-sm">← back</a>
          <span className="text-white/60 text-sm font-medium tracking-widest uppercase">Discover</span>
          <div className="w-12" />
        </header>

        <div className="flex-1 flex items-center justify-center px-6">
          <div className="w-full max-w-sm">
            <div
              className="rounded-2xl p-6 backdrop-blur-sm"
              style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)" }}
            >
              {/* Genre dropdown — hero element */}
              <div className="relative mb-5">
                <select
                  value={genre}
                  onChange={(e) => setGenre(e.target.value)}
                  className="appearance-none w-full bg-white/8 hover:bg-white/12 transition-colors text-white text-2xl font-semibold rounded-xl pl-4 pr-10 py-3 cursor-pointer outline-none"
                  style={{ WebkitAppearance: "none", background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.1)" }}
                >
                  {GENRES.map((g) => (
                    <option key={g.value} value={g.value} className="bg-neutral-900 text-white text-base">
                      {g.label}
                    </option>
                  ))}
                </select>
                <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-white/40 text-sm">▾</span>
              </div>

              {/* Action row */}
              <div className="flex items-center justify-between">
                <span className="text-white/50 text-sm">Recommend me</span>
                <button
                  onClick={handleSubmit}
                  className="px-5 py-2 rounded-xl text-sm font-medium transition-all active:scale-[0.97] hover:opacity-90"
                  style={{ background: "rgba(196,168,240,0.18)", color: "rgba(196,168,240,0.9)" }}
                >
                  → Go
                </button>
              </div>
            </div>

            <p className="text-white/20 text-xs text-center mt-4">
              Songs your friends have liked
            </p>
          </div>
        </div>
      </div>
    );
  }

  // ── Cards phase ───────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col h-screen">
      <header
        className="relative z-20 px-6 py-4 flex items-center justify-between"
        style={{ borderBottom: "1px solid rgba(196,168,240,0.1)" }}
      >
        <a href="/dashboard" className="text-white/40 hover:text-white/70 transition-colors text-sm">← back</a>
        <span className="text-white/60 text-sm font-medium tracking-widest uppercase">Discover</span>
        <button
          onClick={handleChangeGenre}
          className="text-xs px-3 py-1 rounded-full transition-colors hover:opacity-80"
          style={{ background: "rgba(196,168,240,0.12)", color: "rgba(196,168,240,0.7)" }}
        >
          {genreLabel} ×
        </button>
      </header>

      {/* Card area */}
      <div className="relative flex-1 flex items-center justify-center overflow-hidden">
        {/* Background GIF */}
        {current && (
          <div className="absolute inset-0 z-0">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={NATURE_BGS[bgIndex]}
              alt=""
              className="w-full h-full object-cover opacity-30"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-black/50" />
          </div>
        )}

        {loading && (
          <div className="relative z-10 flex flex-col items-center gap-3">
            <div className="w-8 h-8 rounded-full border-2 border-white/20 border-t-white/70 animate-spin" />
            <p className="text-white/40 text-sm">Finding songs…</p>
          </div>
        )}

        {!loading && done && (
          <div className="relative z-10 text-center px-6">
            <p className="text-4xl mb-4">🎵</p>
            <p className="text-white text-lg font-semibold">You&apos;re all caught up</p>
            <p className="text-white/40 text-sm mt-2">
              No more {genreLabel !== "Anything" ? genreLabel + " " : ""}songs to discover right now.
            </p>
            <div className="flex gap-3 justify-center mt-6">
              <button
                onClick={() => fetchPool(genre)}
                className="px-5 py-2.5 rounded-xl bg-white/10 hover:bg-white/15 text-white text-sm transition-colors"
              >
                Refresh
              </button>
              <button
                onClick={handleChangeGenre}
                className="px-5 py-2.5 rounded-xl text-sm transition-colors hover:opacity-80"
                style={{ background: "rgba(196,168,240,0.12)", color: "rgba(196,168,240,0.7)" }}
              >
                Change genre
              </button>
            </div>
          </div>
        )}

        {!loading && !done && current && (
          <div className="relative z-10 w-full max-w-sm px-6 flex flex-col items-center">
            {/* Liked by — above album art */}
            {current.likedByNames.length > 0 && (
              <div className="flex items-center gap-1.5 mb-4">
                <span className="text-white/30 text-xs">♥</span>
                <span className="text-white/40 text-xs">
                  liked by{" "}
                  <span className="text-white/60 font-medium">
                    {current.likedByNames.length === 1
                      ? current.likedByNames[0]
                      : current.likedByNames.length === 2
                      ? `${current.likedByNames[0]} & ${current.likedByNames[1]}`
                      : `${current.likedByNames[0]} +${current.likedByNames.length - 1} others`}
                  </span>
                </span>
              </div>
            )}

            {/* Album art */}
            <div className="relative w-56 h-56 rounded-2xl overflow-hidden shadow-2xl mb-6">
              {current.albumImageUrl ? (
                <Image
                  src={current.albumImageUrl}
                  alt={current.albumName}
                  fill
                  className="object-cover"
                  sizes="224px"
                />
              ) : (
                <div className="w-full h-full bg-white/10 flex items-center justify-center text-4xl">🎵</div>
              )}
            </div>

            {/* Track info */}
            <div className="text-center mb-2">
              <p className="text-white text-xl font-bold leading-tight truncate max-w-xs">{current.name}</p>
              <p className="text-white/60 text-sm mt-1">{current.artists.join(", ")}</p>
              <p className="text-white/30 text-xs mt-1">{current.albumName}</p>
            </div>

            {/* Playback status */}
            {playerState.error && (
              <p className="text-red-400/70 text-xs mb-3 text-center">{playerState.error}</p>
            )}
            {!playerState.isReady && !playerState.error && (
              <p className="text-white/25 text-xs mb-3">Connecting player…</p>
            )}

            {/* Controls */}
            <div className="flex items-center gap-6 mt-2">
              <button
                onClick={handleSkip}
                className="w-14 h-14 rounded-full bg-white/10 hover:bg-white/15 flex items-center justify-center transition-all active:scale-95"
              >
                <span className="text-white/60 text-xl">✕</span>
              </button>

              <button
                onClick={togglePlay}
                disabled={!playerState.isReady}
                className="w-16 h-16 rounded-full bg-white/20 hover:bg-white/30 disabled:opacity-30 flex items-center justify-center transition-all active:scale-95"
              >
                <span className="text-white text-2xl">
                  {playerState.isPlaying ? "⏸" : "▶"}
                </span>
              </button>

              <button
                onClick={handleLike}
                disabled={liking}
                className="w-14 h-14 rounded-full bg-white/10 hover:bg-white/15 disabled:opacity-50 flex items-center justify-center transition-all active:scale-95"
              >
                <span className="text-xl">{liking ? "…" : "♥"}</span>
              </button>
            </div>

            {/* Progress */}
            <p className="text-white/20 text-xs mt-6">{index + 1} / {pool.length}</p>
          </div>
        )}
      </div>
    </div>
  );
}
