"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import { formatRelativeTime } from "@/lib/spotify";
import type { Track } from "@/types";

export function LastPlayedCard({ track }: { track: Track }) {
  const relativeTime = formatRelativeTime(track.playedAt);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [playing, setPlaying] = useState(false);
  const hasPreview = !!track.previewUrl;

  function togglePlay() {
    if (!track.previewUrl) return;

    if (!audioRef.current) {
      audioRef.current = new Audio(track.previewUrl);
      audioRef.current.volume = 0.65;
      audioRef.current.onended = () => setPlaying(false);
    }

    if (playing) {
      audioRef.current.pause();
      setPlaying(false);
    } else {
      audioRef.current.play().catch(() => {});
      setPlaying(true);
    }
  }

  return (
    <div
      className="rounded-2xl backdrop-blur-sm p-5"
      style={{
        background: "var(--card-bg)",
        border: "1px solid var(--card-border)",
      }}
    >
      <p
        className="text-xs font-medium tracking-widest uppercase mb-4"
        style={{ color: "var(--lilac)", opacity: 0.55 }}
      >
        Last Played
      </p>

      <div className="flex items-center gap-4">
        {/* Album art */}
        <div className="relative flex-shrink-0 w-16 h-16 group/art">
          {track.albumImageUrl ? (
            <Image
              src={track.albumImageUrl}
              alt={`${track.albumName} cover`}
              fill
              className="rounded-xl object-cover"
              sizes="64px"
            />
          ) : (
            <div
              className="w-full h-full rounded-xl flex items-center justify-center text-2xl"
              style={{ background: "var(--lilac-dim)" }}
            >
              🎵
            </div>
          )}

          {/* Hover overlay with play icon */}
          {hasPreview && (
            <button
              onClick={togglePlay}
              className="absolute inset-0 rounded-xl flex items-center justify-center transition-all duration-150"
              style={{
                background: playing
                  ? "rgba(14,10,26,0.55)"
                  : "rgba(14,10,26,0)",
              }}
              aria-label={playing ? "Pause" : "Play preview"}
            >
              <span
                className="text-xl text-white transition-opacity duration-150"
                style={{ opacity: playing ? 1 : 0 }}
              >
                ⏸
              </span>
              {/* show ▶ on hover only when not playing */}
              {!playing && (
                <span
                  className="text-xl text-white absolute opacity-0 group-hover/art:opacity-100 transition-opacity duration-150"
                  style={{
                    textShadow: "0 1px 8px rgba(0,0,0,0.6)",
                  }}
                >
                  ▶
                </span>
              )}
            </button>
          )}
        </div>

        {/* Track info */}
        <div className="min-w-0 flex-1">
          <p
            className="font-semibold text-lg leading-tight truncate"
            style={{ color: "var(--foreground)" }}
          >
            {track.name}
          </p>
          <p
            className="text-sm mt-0.5 truncate"
            style={{ color: "var(--lilac-light)", opacity: 0.55 }}
          >
            {track.artists.join(", ")}
          </p>
          <p
            className="text-xs mt-1"
            style={{ color: "var(--lilac)", opacity: 0.3 }}
          >
            {relativeTime}
          </p>
        </div>

        {/* Play / pause pill */}
        {hasPreview && (
          <button
            onClick={togglePlay}
            className="flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all hover:opacity-80"
            style={{
              background: playing
                ? "rgba(196,168,240,0.22)"
                : "var(--lilac-dim)",
              border: "1px solid rgba(196,168,240,0.25)",
              color: "var(--lilac-light)",
            }}
          >
            <span>{playing ? "⏸" : "▶"}</span>
            <span>{playing ? "pause" : "play"}</span>
          </button>
        )}
      </div>

      {/* Now-playing bar */}
      {playing && (
        <div className="mt-4 flex items-center gap-2">
          <NowPlayingBars />
          <span
            className="text-xs"
            style={{ color: "var(--lilac)", opacity: 0.4 }}
          >
            30s preview
          </span>
        </div>
      )}
    </div>
  );
}

function NowPlayingBars() {
  return (
    <span className="flex items-end gap-0.5 h-3">
      {[0, 0.2, 0.1].map((delay, i) => (
        <span
          key={i}
          className="w-0.5 rounded-full"
          style={{
            background: "var(--lilac)",
            opacity: 0.55,
            height: "100%",
            animation: `now-playing-bar 0.9s ease-in-out ${delay}s infinite alternate`,
          }}
        />
      ))}
    </span>
  );
}
