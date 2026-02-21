"use client";

import { useState } from "react";
import type { Signature } from "@/types";

interface SignatureHistoryProps {
  history: Record<string, Signature | null>; // "YYYY-MM-DD" → Signature
}

function formatDateKey(key: string): { short: string; long: string } {
  const [y, m, d] = key.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  const now = new Date();
  const todayMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const diffDays = Math.round(
    (todayMidnight.getTime() - date.getTime()) / 86400000
  );

  const short = date.toLocaleDateString("en-US", { weekday: "short" });
  const long = date.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });

  if (diffDays === 1) return { short: "Yest.", long };
  if (diffDays === 2) return { short: "2d ago", long };
  return { short, long };
}

export function SignatureHistory({ history }: SignatureHistoryProps) {
  // Sort newest-first, show up to 5
  const entries = Object.entries(history)
    .sort(([a], [b]) => b.localeCompare(a))
    .slice(0, 5);

  if (!entries.length) return null;

  return (
    <section className="space-y-3 pt-1">
      <h2
        className="text-xs font-medium tracking-widest uppercase"
        style={{ color: "var(--lilac)", opacity: 0.5 }}
      >
        History
      </h2>

      <div className="space-y-2">
        {entries.map(([key, sig]) => (
          <HistoryRow key={key} dateKey={key} signature={sig} />
        ))}
      </div>
    </section>
  );
}

function HistoryRow({
  dateKey,
  signature,
}: {
  dateKey: string;
  signature: Signature | null;
}) {
  const [revealed, setRevealed] = useState(false);
  const { short, long } = formatDateKey(dateKey);

  return (
    <div
      className="rounded-xl overflow-hidden"
      style={{
        background: "var(--card-bg)",
        border: "1px solid var(--card-border)",
      }}
    >
      {/* Main row */}
      <button
        onClick={() => signature && setRevealed((r) => !r)}
        className="w-full flex items-center gap-3 px-4 py-3 text-left"
        style={{ cursor: signature ? "pointer" : "default" }}
        aria-label={revealed ? "Collapse" : "Expand"}
      >
        {/* Date */}
        <span
          className="text-xs w-12 flex-shrink-0 font-medium"
          style={{ color: "var(--lilac)", opacity: 0.45 }}
        >
          {short}
        </span>

        {/* Emojis */}
        {signature ? (
          <span className="flex items-center gap-1.5 flex-1">
            <span className="text-2xl leading-none">{signature.genre}</span>
            <span className="text-2xl leading-none">{signature.mood}</span>
            <span className="text-2xl leading-none">{signature.theme}</span>
          </span>
        ) : (
          <span
            className="text-sm flex-1"
            style={{ color: "var(--lilac)", opacity: 0.2 }}
          >
            no data
          </span>
        )}

        {/* Chevron */}
        {signature && (
          <span
            className="text-xs flex-shrink-0 transition-transform duration-200"
            style={{
              color: "var(--lilac)",
              opacity: 0.3,
              transform: revealed ? "rotate(180deg)" : "rotate(0deg)",
              display: "inline-block",
            }}
          >
            ▾
          </span>
        )}
      </button>

      {/* Revealed panel — zooms open */}
      {revealed && signature && (
        <div
          className="window-open px-4 pb-4"
          style={{ borderTop: "1px solid rgba(196,168,240,0.1)" }}
        >
          <p
            className="text-xs pt-3 mb-3"
            style={{ color: "var(--lilac)", opacity: 0.35 }}
          >
            {long}
          </p>
          <div className="grid grid-cols-3 gap-2">
            {(
              [
                { emoji: signature.genre, label: signature.genreLabel, sub: "Genre" },
                { emoji: signature.mood,  label: signature.moodLabel,  sub: "Mood"  },
                { emoji: signature.theme, label: signature.themeLabel, sub: "Theme" },
              ] as const
            ).map(({ emoji, label, sub }) => (
              <div key={sub} className="flex flex-col items-center gap-1 py-1">
                <span className="text-2xl leading-none select-none">{emoji}</span>
                <span
                  className="text-xs font-medium text-center leading-tight"
                  style={{ color: "var(--lilac-light)", opacity: 0.8 }}
                >
                  {label}
                </span>
                <span
                  className="text-xs text-center"
                  style={{ color: "var(--lilac)", opacity: 0.3 }}
                >
                  {sub}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
