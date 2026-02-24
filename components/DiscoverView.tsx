"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Image from "next/image";
import { VinylLogo } from "@/components/VinylLogo";
import type { DiscoverTrack } from "@/types";
import { GENRE_UMBRELLAS, mapToUmbrellas } from "@/lib/genres";


type Phase = "prompt" | "cards";

function sleep(ms: number) {
  return new Promise<void>((r) => setTimeout(r, ms));
}

export function DiscoverView() {
  const [phase, setPhase] = useState<Phase>("prompt");
  const [genre, setGenre] = useState("anything");
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [genreSearch, setGenreSearch] = useState("");
  const [availableGenres, setAvailableGenres] = useState<Set<string> | null>(null);
  const [unavailableMsg, setUnavailableMsg] = useState(false);
  const [pool, setPool] = useState<DiscoverTrack[]>([]);
  const [friendCount, setFriendCount] = useState(0);
  const [index, setIndex] = useState(0);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const exitingRef = useRef(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);

  // Swipe state
  const [dragOffset, setDragOffset] = useState(0);
  const [exitDir, setExitDir] = useState<"left" | "right" | null>(null);
  const isDraggingRef = useRef(false);
  const dragStartX = useRef(0);
  const SWIPE_THRESHOLD = 75;

  // Directional entry animation for incoming card
  const [enterFromDir, setEnterFromDir] = useState<"left" | "right" | null>(null);

  // Button animation states
  const [heartAnim, setHeartAnim] = useState(false);
  const [skipAnim, setSkipAnim] = useState(false);
  const [playAnim, setPlayAnim] = useState(false);

  // Undo last like/skip
  const [lastAction, setLastAction] = useState<{ dir: "left" | "right"; track: DiscoverTrack; index: number } | null>(null);


  const fetchPool = useCallback(async (g: string) => {
    setLoading(true);
    setDone(false);
    setIndex(0);
    try {
      const res = await fetch(`/api/discover/pool?genre=${encodeURIComponent(g)}`);
      const json = await res.json() as { tracks: DiscoverTrack[]; friendCount?: number };
      setPool(json.tracks ?? []);
      setFriendCount(json.friendCount ?? 0);
      if (!json.tracks?.length) setDone(true);
    } catch {
      setPool([]);
      setDone(true);
    } finally {
      setLoading(false);
    }
  }, []);

  const current = pool[index] ?? null;

  // Audio playback — 30-second preview via HTML Audio
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.onended = null;
      audioRef.current = null;
    }
    setIsPlaying(false);

    if (!current) return;

    if (!current.previewUrl) {
      // No preview available — skip silently without blocking the user
      fetch("/api/discover/skip", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ trackId: current.id, track: current }),
      }).catch(() => {});
      const next = index + 1;
      if (next >= pool.length) { setDone(true); return; }
      setIndex(next);
      return;
    }

    const audio = new Audio(current.previewUrl);
    audioRef.current = audio;
    audio.volume = 0.9;
    audio.play().then(() => setIsPlaying(true)).catch(() => {});
    audio.onended = () => setIsPlaying(false);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [current?.id]);

  // Clear enter-direction after the browser paints the starting position so the CSS transition runs
  useEffect(() => {
    if (enterFromDir === null) return;
    let id = requestAnimationFrame(() => {
      id = requestAnimationFrame(() => setEnterFromDir(null));
    });
    return () => cancelAnimationFrame(id);
  }, [enterFromDir]);

  // Fetch available genres once when on prompt screen
  useEffect(() => {
    if (phase !== "prompt" || availableGenres !== null) return;
    fetch("/api/discover/genres")
      .then((r) => r.json())
      .then((data: { available: string[] }) => setAvailableGenres(new Set(data.available ?? [])))
      .catch(() => setAvailableGenres(new Set()));
  }, [phase, availableGenres]);

  function handleSubmit() {
    setPhase("cards");
    fetchPool(genre);
  }

  function handleChangeGenre() {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.onended = null;
      audioRef.current = null;
    }
    setIsPlaying(false);
    setPhase("prompt");
    setPool([]);
    setDone(false);
    setIndex(0);
    setAvailableGenres(null);
  }

  async function triggerExit(dir: "left" | "right") {
    if (exitingRef.current || !current) return;
    exitingRef.current = true;

    // Fire API immediately — non-blocking
    if (dir === "right") {
      fetch("/api/discover/like", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ track: current }),
      }).catch(() => {});
    } else {
      fetch("/api/discover/skip", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ trackId: current.id, track: current }),
      }).catch(() => {});
    }

    // Animate card off screen
    setExitDir(dir);
    setDragOffset(0);
    await sleep(320);

    // Card is gone — save action for potential undo, then advance
    exitingRef.current = false;
    setExitDir(null);
    setLastAction({ dir, track: current, index });

    const next = index + 1;
    if (next >= pool.length) {
      setDone(true);
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.onended = null;
        audioRef.current = null;
      }
      setIsPlaying(false);
      return;
    }
    setEnterFromDir(dir === "right" ? "left" : "right");
    setIndex(next);
  }

  async function handleUndo() {
    if (!lastAction) return;
    const { dir, track, index: prevIndex } = lastAction;
    setLastAction(null);

    // Reverse the API action
    if (dir === "right") {
      fetch("/api/songs/unlike", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ trackId: track.id }),
      }).catch(() => {});
    } else {
      fetch("/api/songs/unskip", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ trackId: track.id }),
      }).catch(() => {});
    }

    // Restore card — enters from the same side it left
    setDone(false);
    setEnterFromDir(dir);
    setIndex(prevIndex);
  }

  function togglePlay() {
    const audio = audioRef.current;
    if (!audio) return;
    if (isPlaying) {
      audio.pause();
      setIsPlaying(false);
    } else {
      audio.play().then(() => setIsPlaying(true)).catch(() => {});
    }
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
    if (dragOffset > SWIPE_THRESHOLD) triggerExit("right");
    else if (dragOffset < -SWIPE_THRESHOLD) triggerExit("left");
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

  const genreLabel = genre === "anything" ? "Anything" : (GENRE_UMBRELLAS.find((g) => g.value === genre)?.label ?? genre);

  // Umbrella genre label for the card badge
  const trackGenreLabel = (() => {
    if (!current?.genres?.length) return null;
    for (const g of current.genres) {
      const umbrellas = mapToUmbrellas(g);
      if (umbrellas.length > 0) {
        return GENRE_UMBRELLAS.find((u) => u.value === umbrellas[0])?.label ?? null;
      }
    }
    return null;
  })();

  // Overlay opacity for swipe feedback
  const overlayOpacity = Math.min(Math.abs(dragOffset) / SWIPE_THRESHOLD, 1) * 0.45;
  const overlayColor = dragOffset > 0 ? `rgba(236,72,153,${overlayOpacity})` : `rgba(239,68,68,${overlayOpacity})`;

  // Card transform — arc exit to corner, opposite-corner entry
  const cardStyle: React.CSSProperties = {
    transform: exitDir === "right"
      ? "translateX(110%) translateY(70%) rotate(55deg)"
      : exitDir === "left"
      ? "translateX(-110%) translateY(70%) rotate(-55deg)"
      : enterFromDir === "left"
      ? "translateX(-110%) translateY(70%) rotate(-45deg)"
      : enterFromDir === "right"
      ? "translateX(110%) translateY(70%) rotate(45deg)"
      : `translateX(${dragOffset}px) rotate(${dragOffset * 0.06}deg)`,
    transition: isDraggingRef.current || enterFromDir !== null
      ? "none"
      : "transform 0.35s cubic-bezier(0.25,0.46,0.45,0.94)",
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
                  <div className="fixed inset-0 z-30" onClick={() => { setDropdownOpen(false); setGenreSearch(""); }} />
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
                    maxHeight: dropdownOpen ? "320px" : "0px",
                    opacity: dropdownOpen ? 1 : 0,
                    transition: "max-height 0.28s cubic-bezier(0.4,0,0.2,1), opacity 0.18s ease",
                    background: "rgba(18,12,32,0.97)",
                    border: dropdownOpen ? "1px solid rgba(255,255,255,0.1)" : "none",
                    backdropFilter: "blur(20px)",
                    boxShadow: "0 16px 48px rgba(0,0,0,0.5)",
                  }}
                >
                  {/* Search input */}
                  <div className="px-3 pt-2.5 pb-1.5" style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
                    <input
                      type="text"
                      placeholder="Search genres…"
                      value={genreSearch}
                      onChange={(e) => setGenreSearch(e.target.value)}
                      onClick={(e) => e.stopPropagation()}
                      className="w-full bg-transparent text-sm outline-none placeholder:text-white/20"
                      style={{ color: "rgba(255,255,255,0.7)" }}
                      autoComplete="off"
                      autoCorrect="off"
                      spellCheck={false}
                    />
                  </div>

                  {/* Unavailable genre message */}
                  <div
                    className="text-center text-xs px-4 transition-all duration-500"
                    style={{
                      color: "rgba(255,255,255,0.3)",
                      opacity: unavailableMsg ? 1 : 0,
                      maxHeight: unavailableMsg ? "32px" : "0px",
                      paddingTop: unavailableMsg ? "7px" : "0px",
                      paddingBottom: unavailableMsg ? "7px" : "0px",
                      overflow: "hidden",
                      borderBottom: unavailableMsg ? "1px solid rgba(255,255,255,0.05)" : "1px solid transparent",
                      pointerEvents: "none",
                    }}
                  >
                    your friends don&apos;t seem to listen to this genre
                  </div>

                  <div className="overflow-y-auto" style={{ maxHeight: "220px" }}>
                    {[{ label: "Anything", value: "anything" }, ...GENRE_UMBRELLAS]
                      .filter((g) =>
                        genreSearch.trim() === "" ||
                        g.label.toLowerCase().includes(genreSearch.toLowerCase())
                      )
                      .map((g) => {
                        const isAvailable = g.value === "anything" || availableGenres === null || availableGenres.has(g.value);
                        const isSelected = g.value === genre;
                        return (
                          <button
                            key={g.value}
                            onClick={() => {
                              if (!isAvailable) {
                                setUnavailableMsg(true);
                                setTimeout(() => setUnavailableMsg(false), 2200);
                                return;
                              }
                              setGenre(g.value);
                              setDropdownOpen(false);
                              setGenreSearch("");
                            }}
                            className="w-full text-left px-4 py-2.5 text-sm transition-colors"
                            style={{
                              color: isSelected
                                ? "rgba(196,168,240,1)"
                                : isAvailable
                                ? "rgba(255,255,255,0.65)"
                                : "rgba(255,255,255,0.22)",
                              background: isSelected ? "rgba(196,168,240,0.12)" : "transparent",
                              fontWeight: isSelected ? 600 : 400,
                              cursor: isAvailable ? "pointer" : "default",
                            }}
                            onMouseEnter={(e) => {
                              if (!isSelected && isAvailable) (e.currentTarget as HTMLButtonElement).style.background = "rgba(255,255,255,0.06)";
                            }}
                            onMouseLeave={(e) => {
                              if (!isSelected) (e.currentTarget as HTMLButtonElement).style.background = "transparent";
                            }}
                          >
                            {g.label}
                          </button>
                        );
                      })}
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
        {/* Ambient background */}
        {current && (
          <div className="absolute inset-0 z-0">
            <div className="ambient-bg absolute inset-0 opacity-60" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-black/50" />
          </div>
        )}

        {loading && (
          <div className="relative z-10 flex flex-col items-center gap-4">
            <VinylLogo size={56} />
            <span className="font-bold text-base tracking-tight" style={{ color: "var(--foreground)", opacity: 0.45 }}>sonaara</span>
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
                    {friendCount >= 2 && current.likedByUserIds.length >= friendCount
                      ? "everybody"
                      : current.likedByNames.length === 1
                      ? current.likedByNames[0]
                      : current.likedByNames.length === 2
                      ? `${current.likedByNames[0]} & ${current.likedByNames[1]}`
                      : `${current.likedByNames[0]} & ${current.likedByNames.length - 1} others`}
                  </span>
                </span>
              </div>
            )}

            {/* Album art */}
            <div className="relative w-56 h-56 mb-6">
              <div className="absolute inset-0 rounded-2xl overflow-hidden shadow-2xl">
                {current.albumImageUrl ? (
                  <Image src={current.albumImageUrl} alt={current.albumName} fill className="object-cover" sizes="224px" />
                ) : (
                  <div className="w-full h-full bg-white/10 flex items-center justify-center text-4xl">🎵</div>
                )}
              </div>
              {trackGenreLabel && (
                <div
                  className="absolute top-2.5 right-2.5 z-10 px-2.5 py-1 rounded-lg text-xs font-semibold"
                  style={{
                    background: "rgba(0,0,0,0.55)",
                    backdropFilter: "blur(8px)",
                    color: "rgba(255,255,255,0.9)",
                    letterSpacing: "0.02em",
                  }}
                >
                  {trackGenreLabel}
                </div>
              )}
            </div>

            {/* Track info */}
            <div className="text-center mb-4">
              <p className="text-white text-xl font-bold leading-tight truncate max-w-xs">{current.name}</p>
              <p className="text-white/60 text-base mt-1">{current.artists.join(", ")}</p>
              <p className="text-white/30 text-sm mt-0.5">{current.albumName}</p>
            </div>

            {/* Controls */}
            <div className="flex items-center gap-7 mt-1">
              {/* Skip — red */}
              <button
                onClick={() => { triggerSkipAnim(); triggerExit("left"); }}
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
                disabled={!current?.previewUrl}
                className="w-16 h-16 rounded-full flex items-center justify-center transition-all duration-100 disabled:opacity-30"
                style={{
                  background: playAnim ? "rgba(255,255,255,0.35)" : "rgba(255,255,255,0.15)",
                  transform: playAnim ? "scale(0.92)" : "scale(1)",
                }}
              >
                {isPlaying ? (
                  <svg width="18" height="18" viewBox="0 0 18 18" fill="white">
                    <rect x="2" y="2" width="5" height="14" rx="1.5" />
                    <rect x="11" y="2" width="5" height="14" rx="1.5" />
                  </svg>
                ) : (
                  <svg width="18" height="18" viewBox="0 0 18 18" fill="white">
                    <path d="M4 2.5 L16 9 L4 15.5 Z" />
                  </svg>
                )}
              </button>

              {/* Like — pink */}
              <button
                onClick={() => { triggerHeartAnim(); triggerExit("right"); }}
                className="w-14 h-14 rounded-full flex items-center justify-center transition-all duration-150"
                style={{
                  background: heartAnim ? "rgba(236,72,153,0.3)" : "rgba(255,255,255,0.08)",
                  transform: heartAnim ? "scale(1.2)" : "scale(1)",
                }}
              >
                <span className="text-xl transition-colors duration-150" style={{ color: heartAnim ? "#f472b6" : "rgba(255,255,255,0.7)" }}>♥</span>
              </button>
            </div>

            {/* Undo */}
            {lastAction && (
              <button
                onClick={handleUndo}
                className="mt-5 flex items-center gap-1.5 text-xs transition-opacity hover:opacity-70"
                style={{ color: "rgba(255,255,255,0.3)" }}
              >
                <svg width="13" height="13" viewBox="0 0 13 13" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M2 6.5A4.5 4.5 0 1 0 6.5 2H4" />
                  <path d="M2 2v4h4" />
                </svg>
                undo
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
