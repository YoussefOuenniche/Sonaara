"use client";

import { useState } from "react";

export function JoinForm({ podId, podName }: { podId: string; podName: string }) {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "submitting" | "done" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("submitting");
    setErrorMsg("");

    const res = await fetch(`/api/pods/${podId}/request-join`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    }).catch(() => null);

    if (!res?.ok) {
      setStatus("error");
      setErrorMsg("Something went wrong. Please try again.");
      return;
    }

    setStatus("done");
  }

  if (status === "done") {
    return (
      <div
        className="rounded-2xl p-6 flex flex-col gap-4"
        style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}
      >
        <div className="text-center">
          <p className="text-white font-semibold mb-2">Request sent!</p>
          <p className="text-white/40 text-sm">
            The {podName} admin will add your Spotify account to the allowlist.
            Once approved, log in below.
          </p>
        </div>

        <div className="flex items-center gap-3 py-1">
          <div className="flex-1 h-px" style={{ background: "rgba(255,255,255,0.06)" }} />
          <span className="text-xs" style={{ color: "rgba(255,255,255,0.2)" }}>once approved</span>
          <div className="flex-1 h-px" style={{ background: "rgba(255,255,255,0.06)" }} />
        </div>

        <a
          href={`/api/auth/login?pod=${podId}`}
          className="w-full py-3 rounded-xl text-sm font-semibold tracking-wide text-center transition-all active:scale-[0.97] hover:opacity-90"
          style={{ background: "rgba(196,168,240,0.2)", color: "rgba(196,168,240,1)" }}
        >
          Log in with Spotify →
        </a>
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-2xl p-6 flex flex-col gap-4"
      style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}
    >
      <div>
        <label className="text-white/40 text-xs uppercase tracking-wide mb-1.5 block">
          Your Spotify email
        </label>
        <input
          type="email"
          placeholder="you@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          className="w-full rounded-xl px-4 py-3 text-sm outline-none placeholder:text-white/20"
          style={{
            background: "rgba(255,255,255,0.06)",
            border: "1px solid rgba(255,255,255,0.1)",
            color: "rgba(255,255,255,0.85)",
          }}
        />
      </div>

      {status === "error" && (
        <p className="text-red-400/80 text-xs">{errorMsg}</p>
      )}

      <button
        type="submit"
        disabled={status === "submitting"}
        className="w-full py-3 rounded-xl text-sm font-semibold tracking-wide transition-all active:scale-[0.97] hover:opacity-90 disabled:opacity-40"
        style={{ background: "rgba(196,168,240,0.2)", color: "rgba(196,168,240,1)" }}
      >
        {status === "submitting" ? "Sending…" : "Request to join →"}
      </button>

      <div className="flex items-center gap-3">
        <div className="flex-1 h-px" style={{ background: "rgba(255,255,255,0.06)" }} />
        <span className="text-xs" style={{ color: "rgba(255,255,255,0.2)" }}>already approved?</span>
        <div className="flex-1 h-px" style={{ background: "rgba(255,255,255,0.06)" }} />
      </div>

      <a
        href={`/api/auth/login?pod=${podId}`}
        className="w-full py-3 rounded-xl text-sm font-semibold tracking-wide text-center transition-all active:scale-[0.97] hover:opacity-90"
        style={{
          background: "rgba(255,255,255,0.05)",
          color: "rgba(255,255,255,0.45)",
          border: "1px solid rgba(255,255,255,0.08)",
        }}
      >
        Log in with Spotify →
      </a>
    </form>
  );
}
