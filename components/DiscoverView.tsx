"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Image from "next/image";
import { useSpotifyPlayer } from "@/hooks/useSpotifyPlayer";
import { VinylLogo } from "@/components/VinylLogo";
import type { DiscoverTrack } from "@/types";

const GENRES = [
  { label: "Anything", value: "anything" },
  { label: "Hip-Hop", value: "hip-hop" },
  { label: "R&B", value: "r&b" },
  { label: "Soul", value: "soul" },
  { label: "Neo-Soul", value: "neo-soul" },
  { label: "Pop", value: "pop" },
  { label: "Indie", value: "indie" },
  { label: "Alternative", value: "alternative" },
  { label: "Rock", value: "rock" },
  { label: "Grunge", value: "grunge" },
  { label: "Metal", value: "metal" },
  { label: "Punk", value: "punk" },
  { label: "Electronic", value: "electronic" },
  { label: "House", value: "house" },
  { label: "Techno", value: "techno" },
  { label: "Drum & Bass", value: "drum and bass" },
  { label: "Trap", value: "trap" },
  { label: "Lo-Fi", value: "lo-fi" },
  { label: "Ambient", value: "ambient" },
  { label: "Psychedelic", value: "psychedelic" },
  { label: "Jazz", value: "jazz" },
  { label: "Blues", value: "blues" },
  { label: "Funk", value: "funk" },
  { label: "Disco", value: "disco" },
  { label: "Gospel", value: "gospel" },
  { label: "Reggae", value: "reggae" },
  { label: "Country", value: "country" },
  { label: "Folk", value: "folk" },
  { label: "Classical", value: "classical" },
  { label: "Latin", value: "latin" },
  { label: "Afrobeats", value: "afrobeats" },
  { label: "K-Pop", value: "k-pop" },
];

// Music & nature aesthetic GIFs
const BG_GIFS = [
  "https://media.giphy.com/media/l0MYGkS6RNMiDPVpe/giphy.gif",           // vinyl record spinning
  "https://media.giphy.com/media/3oKIPEqDGUULpEU0aQ/giphy.gif",          // galaxy / stars
  "https://media.giphy.com/media/3ohzdFRpEfxr9smMQ8/giphy.gif",          // fireplace
  "https://media.giphy.com/media/26BRBupa6nRXMGBG8/giphy.gif",           // concert lights
  "https://media2.giphy.com/media/v1.Y2lkPTc5MGI3NjExbzBrM2R6dHVtN2NoMGZ6ZDB5dno3cXk1anMxcHZwbm53ZHdkMmRpZSZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/l0MYt5jPR6QX5pnqM/giphy.gif",   // ocean
  "https://media0.giphy.com/media/v1.Y2lkPTc5MGI3NjExNzYzOGU2YnpsMGxvcXU1cHp3am94NTFwOGVydGhqcWoxeWs4cjNrNiZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/3o7btQ8jDTPGDMDqSk/giphy.gif",  // forest
  "https://media1.giphy.com/media/v1.Y2lkPTc5MGI3NjExNm55bHlxMDFkaWJnb3F0ajJibG80Z2E1aGowZHZlcTN4bDQ1eGl2eSZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/3ohs4xsq0oEhqnV6yk/giphy.gif",  // rain
  "https://media3.giphy.com/media/v1.Y2lkPTc5MGI3NjExZGd4dWZkdmFiNHJlenQxbHJtbzJqMmoxdDRmMGZsMHFzeHE5MHNwciZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/xT9IgG50Lg7rusRgqU/giphy.gif",  // mountains
  "https://media4.giphy.com/media/v1.Y2lkPTc5MGI3NjExNmQ3MzZhcGZxOGlxMjhiZG1paDVvMHdnbXZ4cGZkdHQ3NHp6czM2biZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/3og0INyCmHlNylks9O/giphy.gif",  // misty landscape
  "https://media2.giphy.com/media/v1.Y2lkPTc5MGI3NjExcm9zNmNxdHIzZnEybzlqNGRkcG4xaTF1aGFndHkxZTM5emN4bzZxaiZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/l0MYGb1LuZ3n7dRnO/giphy.gif",  // night nature
];

type Phase = "prompt" | "cards";

function sleep(ms: number) {
  return new Promise<void>((r) => setTimeout(r, ms));
}

export function DiscoverView({
  accessToken,
}: {
  accessToken: string;
  friendNames: Record<string, string>;
}) {
  const [phase, setPhase] = useState<Phase>("prompt");
  const [genre, setGenre] = useState("anything");
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [pool, setPool] = useState<DiscoverTrack[]>([]);
  const [index, setIndex] = useState(0);
  const [bgIndex, setBgIndex] = useState(0);
  const [loading, setLoading] = useState(false);
  const [liking, setLiking] = useState(false);
  const [done, setDone] = useState(false);

  // Swipe state
  const [dragOffset, setDragOffset] = useState(0);
  const [exitDir, setExitDir] = useState<"left" | "right" | null>(null);
  const isDraggingRef = useRef(false);
  const dragStartX = useRef(0);
  const SWIPE_THRESHOLD = 75;

  // Button animation states
  const [heartAnim, setHeartAnim] = useState(false);
  const [skipAnim, setSkipAnim] = useState(false);
  const [playAnim, setPlayAnim] = useState(false);

  const { state: playerState, playTrack, togglePlay, activateElement } = useSpotifyPlayer(accessToken);

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

  useEffect(() => {
    if (current && playerState.isReady) {
      playTrack(current.uri);
      setBgIndex(Math.floor(Math.random() * BG_GIFS.length));
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [current?.id, playerState.isReady]);

  function handleSubmit() {
    activateElement();
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
    if (!current || liking || exitDir) return;
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
    if (!current || exitDir) return;
    await fetch("/api/discover/skip", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ trackId: current.id }),
    });
    advance();
  }

  async function swipeRight() {
    setExitDir("right");
    await sleep(320);
    setExitDir(null);
    setDragOffset(0);
    handleLike();
  }

  async function swipeLeft() {
    setExitDir("left");
    await sleep(320);
    setExitDir(null);
    setDragOffset(0);
    handleSkip();
  }

  function onPointerDown(e: React.PointerEvent) {
    if ((e.target as HTMLElement).closest("button")) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    isDraggingRef.current = true;
    dragStartX.current = e.clientX;
  }

  function onPointerMove(e: React.PointerEvent) {
    if (!isDraggingRef.current) return;
    setDragOffset(e.clientX - dragStartX.current);
  }

  function onPointerUp() {
    if (!isDraggingRef.current) return;
    isDraggingRef.current = false;
    if (dragOffset > SWIPE_THRESHOLD) swipeRight();
    else if (dragOffset < -SWIPE_THRESHOLD) swipeLeft();
    else setDragOffset(0);
  }

  function triggerHeartAnim() {
    setHeartAnim(true);
    setTimeout(() => setHeartAnim(false), 350);
  }
  function triggerSkipAnim() {
    setSkipAnim(true);
    setTimeout(() => setSkipAnim(false), 350);
  }
  function triggerPlayAnim() {
    setPlayAnim(true);
    setTimeout(() => setPlayAnim(false), 200);
  }

  const genreLabel = GENRES.find((g) => g.value === genre)?.label ?? genre;

  // Overlay opacity for swipe feedback
  const overlayOpacity = Math.min(Math.abs(dragOffset) / SWIPE_THRESHOLD, 1) * 0.45;
  const overlayColor = dragOffset > 0 ? `rgba(236,72,153,${overlayOpacity})` : `rgba(239,68,68,${overlayOpacity})`;

  // Card transform
  const cardStyle: React.CSSProperties = {
    transform: exitDir === "right"
      ? "translateX(130%) rotate(20deg)"
      : exitDir === "left"
      ? "translateX(-130%) rotate(-20deg)"
      : `translateX(${dragOffset}px) rotate(${dragOffset * 0.06}deg)`,
    transition: isDraggingRef.current ? "none" : "transform 0.32s cubic-bezier(0.25,0.46,0.45,0.94)",
    cursor: isDraggingRef.current ? "grabbing" : "grab",
    userSelect: "none",
    touchAction: "none",
  };

  // ── Prompt phase ──────────────────────────────────────────────────────────
  if (phase === "prompt") {
    return (
      <div className="flex flex-col min-h-screen pb-24" style={{ backgroundColor: "var(--background)" }}>
        <header
          className="relative z-20 px-6 py-4 flex items-center justify-between"
          style={{ borderBottom: "1px solid rgba(196,168,240,0.08)" }}
        >
          <a href="/dashboard" className="text-white/35 hover:text-white/60 transition-colors text-sm">← back</a>
          <span className="text-white/50 text-xs font-medium tracking-widest uppercase">Discover</span>
          <div className="w-12" />
        </header>

        <div className="flex-1 flex items-center justify-center px-6">
          <div className="w-full max-w-sm">
            {/* Logo */}
            <div className="flex flex-col items-center mb-8">
              <VinylLogo size={64} />
              <span className="text-white/30 text-xs tracking-widest uppercase mt-3">sonaara</span>
            </div>

            <div
              className="rounded-2xl p-6 backdrop-blur-sm"
              style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}
            >
              {/* "Recommend me:" label */}
              <p
                className="text-white mb-4"
                style={{ fontFamily: "Georgia, 'Times New Roman', serif", fontSize: "28px", fontStyle: "italic", fontWeight: 700, letterSpacing: "-0.5px" }}
              >
                Recommend me:
              </p>

              {/* Custom animated genre dropdown */}
              <div className="relative mb-5">
                {/* Backdrop to close */}
                {dropdownOpen && (
                  <div className="fixed inset-0 z-30" onClick={() => setDropdownOpen(false)} />
                )}

                {/* Trigger */}
                <button
                  onClick={() => setDropdownOpen((o) => !o)}
                  className="w-full flex items-center justify-between px-4 py-3 rounded-xl text-left transition-colors"
                  style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.12)" }}
                >
                  <span className="text-white text-lg font-semibold">{genreLabel}</span>
                  <span
                    className="text-white/40 text-sm transition-transform duration-200"
                    style={{ display: "inline-block", transform: dropdownOpen ? "rotate(180deg)" : "rotate(0deg)" }}
                  >
                    ▾
                  </span>
                </button>

                {/* Animated list */}
                <div
                  className="absolute left-0 right-0 z-40 rounded-2xl mt-2 overflow-hidden"
                  style={{
                    maxHeight: dropdownOpen ? "280px" : "0px",
                    opacity: dropdownOpen ? 1 : 0,
                    transition: "max-height 0.28s cubic-bezier(0.4,0,0.2,1), opacity 0.18s ease",
                    background: "rgba(18,12,32,0.97)",
                    border: dropdownOpen ? "1px solid rgba(255,255,255,0.1)" : "none",
                    backdropFilter: "blur(20px)",
                    boxShadow: "0 16px 48px rgba(0,0,0,0.5)",
                  }}
                >
                  <div className="overflow-y-auto" style={{ maxHeight: "280px" }}>
                    {GENRES.map((g) => (
                      <button
                        key={g.value}
                        onClick={() => { setGenre(g.value); setDropdownOpen(false); }}
                        className="w-full text-left px-4 py-2.5 text-sm transition-colors"
                        style={{
                          color: g.value === genre ? "rgba(196,168,240,1)" : "rgba(255,255,255,0.65)",
                          background: g.value === genre ? "rgba(196,168,240,0.12)" : "transparent",
                          fontWeight: g.value === genre ? 600 : 400,
                        }}
                        onMouseEnter={(e) => {
                          if (g.value !== genre) (e.currentTarget as HTMLButtonElement).style.background = "rgba(255,255,255,0.06)";
                        }}
                        onMouseLeave={(e) => {
                          if (g.value !== genre) (e.currentTarget as HTMLButtonElement).style.background = "transparent";
                        }}
                      >
                        {g.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <button
                onClick={handleSubmit}
                className="w-full py-3 rounded-xl text-sm font-semibold tracking-wide transition-all active:scale-[0.97] hover:opacity-90"
                style={{ background: "rgba(196,168,240,0.2)", color: "rgba(196,168,240,1)" }}
              >
                → Go
              </button>
            </div>

            <p className="text-white/15 text-xs text-center mt-5">
              Songs your friends have liked
            </p>
          </div>
        </div>
      </div>
    );
  }

  // ── Cards phase ───────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col h-screen overflow-hidden">
      <header
        className="relative z-20 px-6 py-4 flex items-center justify-between flex-shrink-0"
        style={{ borderBottom: "1px solid rgba(196,168,240,0.08)" }}
      >
        <a href="/dashboard" className="text-white/35 hover:text-white/60 transition-colors text-sm">← back</a>
        <span className="text-white/50 text-xs font-medium tracking-widest uppercase">Discover</span>
        <button
          onClick={handleChangeGenre}
          className="text-xs px-3 py-1 rounded-full transition-all hover:opacity-80"
          style={{ background: "rgba(196,168,240,0.1)", color: "rgba(196,168,240,0.65)" }}
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
            <img src={BG_GIFS[bgIndex]} alt="" className="w-full h-full object-cover opacity-25" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/30 to-black/55" />
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
                className="px-5 py-2.5 rounded-xl text-sm transition-all hover:opacity-80"
                style={{ background: "rgba(196,168,240,0.12)", color: "rgba(196,168,240,0.8)" }}
              >
                Change genre
              </button>
            </div>
          </div>
        )}

        {!loading && !done && current && (
          <div
            className="relative z-10 w-full max-w-sm px-6 flex flex-col items-center"
            style={cardStyle}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerCancel={onPointerUp}
          >
            {/* Swipe direction overlay */}
            {dragOffset !== 0 && (
              <div
                className="absolute inset-0 rounded-2xl pointer-events-none z-20"
                style={{ background: overlayColor }}
              />
            )}

            {/* Liked by — above album art */}
            {current.likedByNames.length > 0 && (
              <div className="flex items-center gap-2 mb-4">
                <span style={{ color: "rgba(236,72,153,0.7)", fontSize: "14px" }}>♥</span>
                <span className="text-white/50 text-sm">
                  liked by{" "}
                  <span className="text-white/80 font-semibold">
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
                <Image src={current.albumImageUrl} alt={current.albumName} fill className="object-cover" sizes="224px" />
              ) : (
                <div className="w-full h-full bg-white/10 flex items-center justify-center text-4xl">🎵</div>
              )}
            </div>

            {/* Track info */}
            <div className="text-center mb-4">
              <p className="text-white text-xl font-bold leading-tight truncate max-w-xs">{current.name}</p>
              <p className="text-white/60 text-base mt-1">{current.artists.join(", ")}</p>
              <p className="text-white/30 text-sm mt-0.5">{current.albumName}</p>
            </div>

            {/* Playback status */}
            {playerState.error && (
              <p className="text-red-400/70 text-xs mb-3 text-center max-w-xs">{playerState.error}</p>
            )}
            {!playerState.isReady && !playerState.error && (
              <p className="text-white/25 text-xs mb-3">Connecting player…</p>
            )}

            {/* Controls */}
            <div className="flex items-center gap-7 mt-1">
              {/* Skip — red */}
              <button
                onClick={() => { triggerSkipAnim(); handleSkip(); }}
                className="w-14 h-14 rounded-full flex items-center justify-center transition-all duration-150"
                style={{
                  background: skipAnim ? "rgba(239,68,68,0.25)" : "rgba(255,255,255,0.08)",
                  transform: skipAnim ? "scale(1.2)" : "scale(1)",
                }}
              >
                <span className="text-xl transition-colors duration-150" style={{ color: skipAnim ? "#f87171" : "rgba(255,255,255,0.55)" }}>✕</span>
              </button>

              {/* Play/pause — white */}
              <button
                onClick={() => { triggerPlayAnim(); togglePlay(); }}
                disabled={!playerState.isReady}
                className="w-16 h-16 rounded-full flex items-center justify-center transition-all duration-100 disabled:opacity-30"
                style={{
                  background: playAnim ? "rgba(255,255,255,0.35)" : "rgba(255,255,255,0.15)",
                  transform: playAnim ? "scale(0.92)" : "scale(1)",
                }}
              >
                <span className="text-white text-2xl">{playerState.isPlaying ? "⏸" : "▶"}</span>
              </button>

              {/* Like — pink */}
              <button
                onClick={() => { triggerHeartAnim(); handleLike(); }}
                disabled={liking}
                className="w-14 h-14 rounded-full flex items-center justify-center transition-all duration-150 disabled:opacity-50"
                style={{
                  background: heartAnim ? "rgba(236,72,153,0.3)" : "rgba(255,255,255,0.08)",
                  transform: heartAnim ? "scale(1.2)" : "scale(1)",
                }}
              >
                <span className="text-xl transition-colors duration-150" style={{ color: heartAnim ? "#f472b6" : "rgba(255,255,255,0.7)" }}>
                  {liking ? "…" : "♥"}
                </span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
