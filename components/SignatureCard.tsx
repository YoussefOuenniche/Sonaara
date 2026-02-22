"use client";

import { useState, useEffect, useRef } from "react";
import Image from "next/image";
import type { Signature, Track } from "@/types";

interface SignatureCardProps {
  latestKey: string;
  latestSignature: Signature | null;
  latestTrackCount: number;
  history: Record<string, Signature | null>;
  tracksPerDay?: Record<string, Track[]>;
}

function keyToLabel(key: string, latestKey: string): string {
  if (key === latestKey) return "Yesterday";
  const parts = key.split("-");
  if (parts.length !== 3) return key;
  const [y, m, d] = parts.map(Number);
  if (!y || !m || !d) return key;
  return new Date(y, m - 1, d).toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });
}

const VALID_KEY = /^\d{4}-\d{2}-\d{2}$/;

export function SignatureCard({
  latestKey,
  latestSignature,
  latestTrackCount,
  history,
  tracksPerDay = {},
}: SignatureCardProps) {
  const cleanHistory = Object.fromEntries(
    Object.entries(history).filter(([k]) => VALID_KEY.test(k))
  );
  const allEntries: Record<string, Signature | null> = {
    ...cleanHistory,
    [latestKey]: latestSignature,
  };

  // Newest first, capped at latest + 5 previous days
  const sortedKeys = Object.keys(allEntries).sort().reverse().slice(0, 6);
  const hasHistory = sortedKeys.length > 1;

  const [currentKey, setCurrentKey] = useState(latestKey);
  const [revealed, setRevealed] = useState(false);
  const [showTracks, setShowTracks] = useState(false);

  useEffect(() => { setRevealed(false); setShowTracks(false); }, [currentKey]);

  const currentIdx = sortedKeys.indexOf(currentKey);
  const currentSig = allEntries[currentKey] ?? null;
  const isLatest = currentKey === latestKey;
  const canGoOlder = currentIdx < sortedKeys.length - 1;
  const canGoNewer = currentIdx > 0;
  const dayTracks = tracksPerDay[currentKey] ?? [];

  return (
    <div
      className="rounded-2xl backdrop-blur-sm p-6"
      style={{
        background: "var(--card-bg)",
        border: "1px solid var(--card-border)",
      }}
    >
      {/* ── Header ── */}
      <div className="flex items-center justify-between mb-5">
        <p
          className="text-xs font-medium tracking-widest uppercase"
          style={{ color: "var(--lilac)", opacity: 0.65 }}
        >
          Your Signature
        </p>

        <div className="flex items-center gap-1">
          {canGoOlder && (
            <button
              onClick={() => setCurrentKey(sortedKeys[currentIdx + 1])}
              className="text-xs px-1.5 py-0.5 rounded transition-opacity hover:opacity-80"
              style={{ color: "var(--lilac)", opacity: 0.5 }}
              aria-label="Older"
            >
              ←
            </button>
          )}
          <span className="text-xs" style={{ color: "var(--lilac-light)", opacity: 0.4 }}>
            {keyToLabel(currentKey, latestKey)}
          </span>
          {canGoNewer && (
            <button
              onClick={() => setCurrentKey(sortedKeys[currentIdx - 1])}
              className="text-xs px-1.5 py-0.5 rounded transition-opacity hover:opacity-80"
              style={{ color: "var(--lilac)", opacity: 0.5 }}
              aria-label="Newer"
            >
              →
            </button>
          )}
        </div>
      </div>

      {/* Back-to-latest pill */}
      {!isLatest && (
        <div className="flex justify-center mb-4">
          <button
            onClick={() => setCurrentKey(latestKey)}
            className="text-xs px-2.5 py-1 rounded-full transition-opacity hover:opacity-80"
            style={{
              color: "var(--lilac)",
              background: "rgba(196,168,240,0.1)",
              border: "1px solid rgba(196,168,240,0.2)",
            }}
          >
            back to latest ↩
          </button>
        </div>
      )}

      {/* ── Signature content ── */}
      {!currentSig ? (
        <div className="py-6 text-center">
          <p className="text-sm" style={{ color: "var(--lilac)", opacity: 0.4 }}>
            No listening data for this day
          </p>
        </div>
      ) : revealed ? (
        <div
          className="window-open rounded-xl p-4"
          style={{
            background: "rgba(196,168,240,0.08)",
            border: "1px solid rgba(196,168,240,0.2)",
          }}
        >
          <div className="flex items-center justify-between mb-4">
            <p className="text-xs tracking-widest uppercase" style={{ color: "var(--lilac)", opacity: 0.45 }}>
              What it means
            </p>
            <button
              onClick={() => setRevealed(false)}
              className="text-xs transition-opacity hover:opacity-80 leading-none"
              style={{ color: "var(--lilac)", opacity: 0.45 }}
              aria-label="Close"
            >
              ✕
            </button>
          </div>

          <div className="grid grid-cols-3 gap-3">
            {(
              [
                { emoji: currentSig.genre, label: currentSig.genreLabel, sub: "Genre" },
                { emoji: currentSig.mood,  label: currentSig.moodLabel,  sub: "Mood"  },
                { emoji: currentSig.theme, label: currentSig.themeLabel, sub: "Theme" },
              ] as const
            ).map(({ emoji, label, sub }) => (
              <div key={sub} className="flex flex-col items-center gap-1.5 py-1">
                <span className="text-3xl leading-none select-none">{emoji}</span>
                <span className="text-sm font-medium text-center leading-tight"
                  style={{ color: "var(--lilac-light)", opacity: 0.85 }}>
                  {label}
                </span>
                <span className="text-xs text-center" style={{ color: "var(--lilac)", opacity: 0.35 }}>
                  {sub}
                </span>
              </div>
            ))}
          </div>

          {isLatest && latestTrackCount > 0 && (
            <p className="text-xs text-center mt-4" style={{ color: "var(--lilac)", opacity: 0.22 }}>
              Based on {latestTrackCount} track{latestTrackCount === 1 ? "" : "s"}
            </p>
          )}
        </div>
      ) : (
        <button
          onClick={() => setRevealed(true)}
          className="w-full focus:outline-none group"
          aria-label="Reveal signature"
        >
          <div className="flex justify-center items-center gap-3">
            {[currentSig.genre, currentSig.mood, currentSig.theme].map((emoji, i) => (
              <span
                key={i}
                className="text-6xl leading-none select-none"
                style={{ filter: "drop-shadow(0 0 14px rgba(196,168,240,0.35))" }}
              >
                {emoji}
              </span>
            ))}
          </div>
          <p
            className="text-xs text-center mt-4 transition-opacity group-hover:opacity-60"
            style={{ color: "var(--lilac)", opacity: 0.3 }}
          >
            tap to reveal
          </p>
        </button>
      )}

      {/* ── Dot indicators — below the emojis ── */}
      {hasHistory && (
        <div className="flex justify-center gap-1 mt-5">
          {sortedKeys.map((k) => (
            <button
              key={k}
              onClick={() => setCurrentKey(k)}
              className="rounded-full transition-all duration-200"
              style={{
                width: k === currentKey ? 16 : 6,
                height: 6,
                background: "var(--lilac)",
                opacity: k === currentKey ? 0.6 : 0.2,
              }}
              aria-label={keyToLabel(k, latestKey)}
            />
          ))}
        </div>
      )}

      {/* ── Day track list (collapsed by default) ── */}
      {dayTracks.length > 0 && (
        <>
          <button
            onClick={() => setShowTracks((s) => !s)}
            className="w-full flex items-center justify-between mt-4 pt-4 text-xs transition-opacity hover:opacity-70"
            style={{
              borderTop: "1px solid rgba(196,168,240,0.1)",
              color: "var(--lilac)",
              opacity: 0.4,
            }}
          >
            <span>{dayTracks.length} track{dayTracks.length === 1 ? "" : "s"} that day</span>
            <span>{showTracks ? "↑ hide" : "↓ show"}</span>
          </button>
          {showTracks && <DayTrackList key={currentKey} tracks={dayTracks} />}
        </>
      )}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────── */

function DayTrackList({ tracks }: { tracks: Track[] }) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(false);

  // Stop audio when unmounted (day changes)
  useEffect(() => {
    return () => { audioRef.current?.pause(); };
  }, []);

  function toggle(track: Track) {
    if (!track.previewUrl) return;

    if (playingId === track.id) {
      audioRef.current?.pause();
      setPlayingId(null);
      return;
    }

    audioRef.current?.pause();
    const a = new Audio(track.previewUrl);
    a.volume = 0.65;
    a.onended = () => setPlayingId(null);
    a.play().catch(() => {});
    audioRef.current = a;
    setPlayingId(track.id);
  }

  const shown = expanded ? tracks : tracks.slice(0, 5);

  return (
    <div className="mt-2 space-y-1.5">
      {shown.map((track, i) => {
        const isPlaying = playingId === track.id;
        return (
          <div
            key={`${track.id}-${i}`}
            className="flex items-center gap-2.5 rounded-xl px-3 py-2 transition-all"
            style={{
              background: isPlaying ? "rgba(196,168,240,0.1)" : "transparent",
              border: `1px solid ${isPlaying ? "rgba(196,168,240,0.2)" : "transparent"}`,
            }}
          >
            {/* Album art */}
            <div className="relative w-8 h-8 flex-shrink-0">
              {track.albumImageUrl ? (
                <Image
                  src={track.albumImageUrl}
                  alt={track.albumName}
                  fill
                  className="rounded-lg object-cover"
                  sizes="32px"
                />
              ) : (
                <div className="w-full h-full rounded-lg flex items-center justify-center text-xs"
                  style={{ background: "var(--lilac-dim)" }}>
                  🎵
                </div>
              )}
            </div>

            {/* Info */}
            <div className="min-w-0 flex-1">
              <p className="text-xs font-medium truncate leading-tight"
                style={{ color: isPlaying ? "var(--lilac-light)" : "var(--foreground)", opacity: 0.8 }}>
                {track.name}
              </p>
              <p className="text-xs truncate" style={{ color: "var(--lilac)", opacity: 0.35 }}>
                {track.artists.join(", ")}
              </p>
            </div>

            {/* Play button */}
            {track.previewUrl ? (
              <button
                onClick={() => toggle(track)}
                className="flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xs transition-all hover:opacity-80"
                style={{
                  background: isPlaying ? "rgba(196,168,240,0.3)" : "var(--lilac-dim)",
                  border: "1px solid rgba(196,168,240,0.2)",
                  color: "var(--lilac-light)",
                }}
              >
                {isPlaying ? (
                  <svg width="10" height="10" viewBox="0 0 10 10" fill="currentColor">
                    <rect x="1" y="1" width="3" height="8" rx="1" />
                    <rect x="6" y="1" width="3" height="8" rx="1" />
                  </svg>
                ) : (
                  <svg width="10" height="10" viewBox="0 0 10 10" fill="currentColor">
                    <path d="M2 1.5 L9 5 L2 8.5 Z" />
                  </svg>
                )}
              </button>
            ) : (
              <div className="w-6 h-6 flex-shrink-0" />
            )}
          </div>
        );
      })}

      {tracks.length > 5 && (
        <button
          onClick={() => setExpanded((e) => !e)}
          className="w-full text-center text-xs py-1.5 rounded-xl transition-opacity hover:opacity-70 mt-1"
          style={{ color: "var(--lilac)", opacity: 0.35 }}
        >
          {expanded ? "show less" : `+ ${tracks.length - 5} more`}
        </button>
      )}
    </div>
  );
}
