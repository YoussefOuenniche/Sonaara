"use client";

import { useState } from "react";

export function JoinPodInput() {
  const [value, setValue] = useState("");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = value.trim();
    // Accept either a full URL or just the pod ID
    const urlMatch = trimmed.match(/\/join\/([a-z0-9]+)/i);
    const podId = urlMatch ? urlMatch[1] : trimmed;
    if (podId) window.location.href = `/join/${podId}`;
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-2 w-full">
      <input
        type="text"
        placeholder="Paste your invite link or code"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        className="w-full rounded-2xl px-4 py-4 text-sm outline-none placeholder:text-white/20 text-center"
        style={{
          background: "rgba(255,255,255,0.04)",
          border: "1px solid rgba(255,255,255,0.08)",
          color: "rgba(255,255,255,0.75)",
        }}
      />
      <button
        type="submit"
        disabled={!value.trim()}
        className="w-full py-4 rounded-2xl text-sm font-semibold tracking-wide transition-all hover:opacity-90 active:scale-[0.97] disabled:opacity-25"
        style={{
          background: "rgba(255,255,255,0.05)",
          color: "rgba(255,255,255,0.45)",
          border: "1px solid rgba(255,255,255,0.08)",
        }}
      >
        Join a pod →
      </button>
    </form>
  );
}
