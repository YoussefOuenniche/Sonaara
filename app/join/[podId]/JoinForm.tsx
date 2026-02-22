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
        className="rounded-2xl p-6 text-center"
        style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}
      >
        <p className="text-white font-semibold mb-2">Request sent!</p>
        <p className="text-white/40 text-sm">
          The {podName} admin will add your Spotify account to the pod. You&apos;ll be able to log in once approved.
        </p>
        <a
          href="/"
          className="block text-center text-white/30 text-xs mt-5 hover:text-white/50 transition-colors"
        >
          Back to home →
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

      <p className="text-white/15 text-xs text-center">
        The admin will add you to the Spotify allowlist. You&apos;ll connect your Spotify account after approval.
      </p>
    </form>
  );
}
