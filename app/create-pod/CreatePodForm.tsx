"use client";

import { useState, useEffect } from "react";

type Status = "idle" | "submitting" | "polling" | "ready" | "error";

export function CreatePodForm({ userEmail }: { userEmail: string }) {
  const [podName, setPodName] = useState("");
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [podId, setPodId] = useState<string | null>(null);
  const [joinLink, setJoinLink] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState("");
  const [copied, setCopied] = useState(false);

  // Poll for pod status
  useEffect(() => {
    if (status !== "polling" || !podId) return;
    const interval = setInterval(async () => {
      const res = await fetch(`/api/pods/${podId}/status`).catch(() => null);
      if (!res?.ok) return;
      const data = await res.json() as { status: string; errorMessage?: string };
      if (data.status === "ready") {
        setStatus("ready");
        setJoinLink(`${window.location.origin}/join/${podId}`);
        clearInterval(interval);
      } else if (data.status === "error") {
        setStatus("error");
        setErrorMsg(data.errorMessage ?? "Something went wrong during setup.");
        clearInterval(interval);
      }
    }, 3000);
    return () => clearInterval(interval);
  }, [status, podId]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("submitting");
    setErrorMsg("");

    const res = await fetch("/api/pods/create", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ podName, password }),
    }).catch(() => null);

    if (!res?.ok) {
      const data = await res?.json().catch(() => ({})) as { error?: string };
      setStatus("error");
      setErrorMsg(data.error ?? "Failed to start pod creation.");
      return;
    }

    const data = await res.json() as { podId: string };
    setPodId(data.podId);
    setStatus("polling");
  }

  function copyLink() {
    if (!joinLink) return;
    navigator.clipboard.writeText(joinLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  const inputStyle = {
    background: "rgba(255,255,255,0.06)",
    border: "1px solid rgba(255,255,255,0.1)",
    color: "rgba(255,255,255,0.85)",
  };

  if (status === "polling") {
    return (
      <div className="rounded-2xl p-6 text-center" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}>
        <div className="flex justify-center mb-4">
          <div className="w-8 h-8 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: "rgba(196,168,240,0.6)", borderTopColor: "transparent" }} />
        </div>
        <p className="text-white/70 text-sm font-medium">Setting up your pod…</p>
        <p className="text-white/30 text-xs mt-1">This takes 1–3 minutes</p>
      </div>
    );
  }

  if (status === "ready" && joinLink) {
    return (
      <div className="rounded-2xl p-6" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}>
        <p className="text-white font-semibold mb-1">Pod created!</p>
        <p className="text-white/40 text-sm mb-5">Share this link with your friends to invite them.</p>
        <div
          className="rounded-xl px-4 py-3 text-sm font-mono break-all mb-3"
          style={{ background: "rgba(196,168,240,0.08)", color: "rgba(196,168,240,0.9)", border: "1px solid rgba(196,168,240,0.15)" }}
        >
          {joinLink}
        </div>
        <button
          onClick={copyLink}
          className="w-full py-3 rounded-xl text-sm font-semibold tracking-wide transition-all active:scale-[0.97]"
          style={{ background: "rgba(196,168,240,0.2)", color: "rgba(196,168,240,1)" }}
        >
          {copied ? "Copied!" : "Copy invite link"}
        </button>
        <a
          href="/dashboard"
          className="block text-center text-white/30 text-xs mt-4 hover:text-white/50 transition-colors"
        >
          Go to dashboard →
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
        <label className="text-white/40 text-xs uppercase tracking-wide mb-1.5 block">Pod name</label>
        <input
          type="text"
          placeholder="e.g. The Crew"
          value={podName}
          onChange={(e) => setPodName(e.target.value)}
          required
          className="w-full rounded-xl px-4 py-3 text-sm outline-none placeholder:text-white/20"
          style={inputStyle}
        />
      </div>

      {userEmail && (
        <div>
          <label className="text-white/40 text-xs uppercase tracking-wide mb-1.5 block">Spotify account</label>
          <div
            className="w-full rounded-xl px-4 py-3 text-sm"
            style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)", color: "rgba(255,255,255,0.4)" }}
          >
            {userEmail}
          </div>
        </div>
      )}

      <div>
        <label className="text-white/40 text-xs uppercase tracking-wide mb-1.5 block">Spotify password</label>
        <input
          type="password"
          placeholder="••••••••"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          className="w-full rounded-xl px-4 py-3 text-sm outline-none placeholder:text-white/20"
          style={inputStyle}
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
        {status === "submitting" ? "Starting…" : "Create pod →"}
      </button>

      <p className="text-white/15 text-xs text-center">
        Your password is used once to create the Spotify app and is never stored.
      </p>
    </form>
  );
}
