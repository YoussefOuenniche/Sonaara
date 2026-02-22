"use client";

import { useState } from "react";

export function JoinForm({
  podId,
  podName,
  isFull,
  isPending,
  userEmail,
}: {
  podId: string;
  podName: string;
  isFull: boolean;
  isPending: boolean;
  userEmail: string | null;
}) {
  const [joining, setJoining] = useState(false);
  const [joined, setJoined] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  async function handleJoinAs() {
    setJoining(true);
    setErrorMsg("");
    const res = await fetch(`/api/pods/${podId}/request-join`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: userEmail }),
    }).catch(() => null);

    if (!res?.ok) {
      const data = await res?.json().catch(() => ({})) as { error?: string };
      setErrorMsg(data.error === "Pod is full" ? "This pod is full." : "Something went wrong.");
      setJoining(false);
      return;
    }

    setJoined(true);
    setJoining(false);
  }

  const cardStyle = {
    background: "rgba(255,255,255,0.04)",
    border: "1px solid rgba(255,255,255,0.08)",
  };

  const divider = (label: string) => (
    <div className="flex items-center gap-3 py-1">
      <div className="flex-1 h-px" style={{ background: "rgba(255,255,255,0.06)" }} />
      <span className="text-xs" style={{ color: "rgba(255,255,255,0.2)" }}>{label}</span>
      <div className="flex-1 h-px" style={{ background: "rgba(255,255,255,0.06)" }} />
    </div>
  );

  const loginBtn = () => (
    <a
      href={`/api/auth/login?pod=${podId}`}
      className="w-full py-3 rounded-xl text-sm font-semibold tracking-wide text-center transition-all active:scale-[0.97] hover:opacity-90"
      style={{ background: "rgba(196,168,240,0.15)", color: "rgba(196,168,240,0.8)" }}
    >
      Log in →
    </a>
  );

  // Pod is full
  if (isFull) {
    return (
      <div className="rounded-2xl p-6 flex flex-col gap-4" style={cardStyle}>
        <div className="text-center">
          <p className="text-white/60 font-semibold mb-1">Pod is full</p>
          <p className="text-white/30 text-sm">{podName} has reached its member limit.</p>
        </div>
        {divider("already a member?")}
        {loginBtn()}
      </div>
    );
  }

  // Request sent (returned from OAuth join flow, or just submitted)
  if (isPending || joined) {
    return (
      <div className="rounded-2xl p-6 flex flex-col gap-4" style={cardStyle}>
        <div className="text-center">
          <p className="text-white font-semibold mb-2">Request sent!</p>
          <p className="text-white/40 text-sm">
            The {podName} admin will add your Spotify account to the allowlist.
            Once approved, log in below.
          </p>
        </div>
        {divider("once approved")}
        <a
          href={`/api/auth/login?pod=${podId}`}
          className="w-full py-3 rounded-xl text-sm font-semibold tracking-wide text-center transition-all active:scale-[0.97] hover:opacity-90"
          style={{ background: "rgba(196,168,240,0.2)", color: "rgba(196,168,240,1)" }}
        >
          Log in →
        </a>
      </div>
    );
  }

  // Already logged in — offer one-click join
  if (userEmail) {
    return (
      <div className="rounded-2xl p-6 flex flex-col gap-4" style={cardStyle}>
        <p className="text-white/40 text-sm text-center">
          Joining as <span style={{ color: "rgba(196,168,240,0.7)" }}>{userEmail}</span>
        </p>

        {errorMsg && <p className="text-red-400/80 text-xs text-center">{errorMsg}</p>}

        <button
          onClick={handleJoinAs}
          disabled={joining}
          className="w-full py-3 rounded-xl text-sm font-semibold tracking-wide transition-all active:scale-[0.97] hover:opacity-90 disabled:opacity-40"
          style={{ background: "rgba(196,168,240,0.2)", color: "rgba(196,168,240,1)" }}
        >
          {joining ? "Sending request…" : `Join ${podName} →`}
        </button>

        {divider("already approved?")}
        {loginBtn()}
      </div>
    );
  }

  // Default: not logged in
  return (
    <div className="rounded-2xl p-6 flex flex-col gap-4" style={cardStyle}>
      <a
        href={`/api/auth/login?join=${podId}`}
        className="w-full py-3 rounded-xl text-sm font-semibold tracking-wide text-center transition-all active:scale-[0.97] hover:opacity-90"
        style={{ background: "rgba(196,168,240,0.2)", color: "rgba(196,168,240,1)" }}
      >
        Request to join →
      </a>

      {divider("already approved?")}

      {loginBtn()}
    </div>
  );
}
