"use client";

import { useState } from "react";
import Image from "next/image";
import type { DiscoverTrack } from "@/types";

type Tab = "liked" | "disliked";

export function SongsView({
  likedTracks: initialLiked,
  skippedTracks: initialSkipped,
}: {
  likedTracks: DiscoverTrack[];
  skippedTracks: DiscoverTrack[];
}) {
  const [tab, setTab] = useState<Tab>("liked");
  const [liked, setLiked] = useState(initialLiked);
  const [skipped, setSkipped] = useState(initialSkipped);
  const [removing, setRemoving] = useState<Set<string>>(new Set());

  async function unlike(trackId: string) {
    setRemoving((s) => new Set(s).add(trackId));
    await fetch("/api/songs/unlike", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ trackId }),
    }).catch(() => {});
    setLiked((prev) => prev.filter((t) => t.id !== trackId));
    setRemoving((s) => { const n = new Set(s); n.delete(trackId); return n; });
  }

  async function unskip(trackId: string) {
    setRemoving((s) => new Set(s).add(trackId));
    await fetch("/api/songs/unskip", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ trackId }),
    }).catch(() => {});
    setSkipped((prev) => prev.filter((t) => t.id !== trackId));
    setRemoving((s) => { const n = new Set(s); n.delete(trackId); return n; });
  }

  const tracks = tab === "liked" ? liked : skipped;

  return (
    <div className="flex flex-col min-h-screen pb-24">
      {/* Header */}
      <header
        className="px-6 py-4 flex items-center justify-between flex-shrink-0"
        style={{ borderBottom: "1px solid rgba(196,168,240,0.08)" }}
      >
        <span className="text-white/50 text-xs font-medium tracking-widest uppercase">Songs</span>
      </header>

      {/* Tab selector */}
      <div className="flex mx-6 mt-5 mb-4 rounded-xl overflow-hidden"
        style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.07)" }}>
        {(["liked", "disliked"] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className="flex-1 py-2.5 text-sm font-medium transition-all duration-200 rounded-xl"
            style={{
              background: tab === t ? "rgba(196,168,240,0.15)" : "transparent",
              color: tab === t ? "rgba(196,168,240,1)" : "rgba(255,255,255,0.3)",
            }}
          >
            {t === "liked" ? `♥ Liked` : `✕ Disliked`}
            <span className="ml-1.5 text-xs opacity-60">
              ({t === "liked" ? liked.length : skipped.length})
            </span>
          </button>
        ))}
      </div>

      {/* Track list */}
      <div className="flex-1 px-6 space-y-2">
        {tracks.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <span className="text-4xl">{tab === "liked" ? "♥" : "✕"}</span>
            <p className="text-sm" style={{ color: "var(--lilac)", opacity: 0.35 }}>
              {tab === "liked" ? "No liked songs yet" : "No disliked songs yet"}
            </p>
          </div>
        ) : (
          tracks.map((track) => (
            <TrackRow
              key={track.id}
              track={track}
              isRemoving={removing.has(track.id)}
              onRemove={() => tab === "liked" ? unlike(track.id) : unskip(track.id)}
              removeLabel={tab === "liked" ? "Unlike" : "Remove"}
            />
          ))
        )}
      </div>
    </div>
  );
}

function TrackRow({
  track,
  isRemoving,
  onRemove,
  removeLabel,
}: {
  track: DiscoverTrack;
  isRemoving: boolean;
  onRemove: () => void;
  removeLabel: string;
}) {
  return (
    <div
      className="flex items-center gap-3 rounded-2xl px-3 py-2.5 transition-opacity"
      style={{
        background: "rgba(255,255,255,0.04)",
        border: "1px solid rgba(255,255,255,0.06)",
        opacity: isRemoving ? 0.4 : 1,
      }}
    >
      {/* Album art */}
      <div className="relative w-10 h-10 flex-shrink-0">
        {track.albumImageUrl ? (
          <Image
            src={track.albumImageUrl}
            alt={track.albumName}
            fill
            className="rounded-xl object-cover"
            sizes="40px"
          />
        ) : (
          <div className="w-full h-full rounded-xl flex items-center justify-center text-sm"
            style={{ background: "var(--lilac-dim)" }}>
            🎵
          </div>
        )}
      </div>

      {/* Info */}
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium truncate leading-tight" style={{ color: "var(--foreground)", opacity: 0.85 }}>
          {track.name}
        </p>
        <p className="text-xs truncate mt-0.5" style={{ color: "var(--lilac)", opacity: 0.4 }}>
          {track.artists.join(", ")}
        </p>
      </div>

      {/* Delete button */}
      <button
        onClick={onRemove}
        disabled={isRemoving}
        aria-label={removeLabel}
        className="flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center transition-all hover:opacity-80 disabled:pointer-events-none"
        style={{ background: "rgba(255,255,255,0.07)", color: "rgba(255,255,255,0.35)" }}
      >
        <svg width="10" height="10" viewBox="0 0 10 10" fill="currentColor">
          <path d="M1.5 1.5 L8.5 8.5 M8.5 1.5 L1.5 8.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      </button>
    </div>
  );
}
