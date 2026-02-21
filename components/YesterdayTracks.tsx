"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import type { Track } from "@/types";

interface YesterdayTracksProps {
  tracks: Track[];
  yesterdayLabel: string;
}

export function YesterdayTracks({ tracks, yesterdayLabel }: YesterdayTracksProps) {
  const [activeId, setActiveId] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [expanded, setExpanded] = useState(false);

  const displayed = expanded ? tracks : tracks.slice(0, 5);

  function playTrack(track: Track) {
    if (!track.previewUrl) return;

    if (activeId === track.id) {
      // pause current
      audioRef.current?.pause();
      setActiveId(null);
      return;
    }

    // Stop whatever is playing
    audioRef.current?.pause();

    const audio = new Audio(track.previewUrl);
    audio.volume = 0.65;
    audio.onended = () => setActiveId(null);
    audio.play().catch(() => {});
    audioRef.current = audio;
    setActiveId(track.id);
  }

  if (!tracks.length) return null;

  return (
    <section className="space-y-3 pt-1">
      <div className="flex items-center justify-between">
        <h2
          className="text-xs font-medium tracking-widest uppercase"
          style={{ color: "var(--lilac)", opacity: 0.5 }}
        >
          Yesterday&apos;s Tracks
        </h2>
        <span
          className="text-xs"
          style={{ color: "var(--lilac)", opacity: 0.3 }}
        >
          {tracks.length} track{tracks.length === 1 ? "" : "s"}
        </span>
      </div>

      <div className="space-y-1.5">
        {displayed.map((track, i) => (
          <TrackRow
            key={`${track.id}-${i}`}
            track={track}
            isPlaying={activeId === track.id}
            onPlay={() => playTrack(track)}
          />
        ))}
      </div>

      {tracks.length > 5 && (
        <button
          onClick={() => setExpanded((e) => !e)}
          className="w-full text-center text-xs py-2 rounded-xl transition-opacity hover:opacity-70"
          style={{
            color: "var(--lilac)",
            opacity: 0.4,
            border: "1px solid var(--card-border)",
            background: "var(--card-bg)",
          }}
        >
          {expanded ? "Show less" : `Show ${tracks.length - 5} more`}
        </button>
      )}
    </section>
  );
}

function TrackRow({
  track,
  isPlaying,
  onPlay,
}: {
  track: Track;
  isPlaying: boolean;
  onPlay: () => void;
}) {
  return (
    <div
      className="flex items-center gap-3 p-3 rounded-xl transition-all"
      style={{
        background: isPlaying ? "rgba(196,168,240,0.1)" : "var(--card-bg)",
        border: `1px solid ${isPlaying ? "rgba(196,168,240,0.25)" : "var(--card-border)"}`,
      }}
    >
      {/* Album art */}
      <div className="relative flex-shrink-0 w-9 h-9">
        {track.albumImageUrl ? (
          <Image
            src={track.albumImageUrl}
            alt={track.albumName}
            fill
            className="rounded-lg object-cover"
            sizes="36px"
          />
        ) : (
          <div
            className="w-full h-full rounded-lg flex items-center justify-center text-sm"
            style={{ background: "var(--lilac-dim)" }}
          >
            🎵
          </div>
        )}
      </div>

      {/* Track info */}
      <div className="min-w-0 flex-1">
        <p
          className="text-sm font-medium leading-tight truncate"
          style={{ color: isPlaying ? "var(--lilac-light)" : "var(--foreground)", opacity: isPlaying ? 1 : 0.8 }}
        >
          {track.name}
        </p>
        <p
          className="text-xs truncate mt-0.5"
          style={{ color: "var(--lilac)", opacity: 0.4 }}
        >
          {track.artists.join(", ")}
        </p>
      </div>

      {/* Play button */}
      {track.previewUrl ? (
        <button
          onClick={onPlay}
          className="flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-xs transition-all hover:opacity-80"
          style={{
            background: isPlaying ? "rgba(196,168,240,0.3)" : "var(--lilac-dim)",
            border: "1px solid var(--card-border)",
            color: "var(--lilac-light)",
          }}
          aria-label={isPlaying ? "Pause" : "Play 30s preview"}
        >
          {isPlaying ? "⏸" : "▶"}
        </button>
      ) : (
        <div className="w-7 h-7 flex-shrink-0" />
      )}
    </div>
  );
}
