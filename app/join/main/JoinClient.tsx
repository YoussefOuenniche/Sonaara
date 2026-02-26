"use client";

import { useState } from "react";
import { VinylLogo } from "@/components/VinylLogo";

interface Props {
  podId: string;
  podName: string;
  isFull: boolean;
  isLoggedIn: boolean;
  userEmail: string | null;
  existingStatus: "pending" | "processing" | "approved" | "denied" | null;
}

export function JoinClient({ podId, podName, isFull, isLoggedIn, existingStatus }: Props) {
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleRequest() {
    if (!isLoggedIn) {
      // Redirect to Spotify OAuth — callback will redirect back to /join/main
      window.location.href = `/api/auth/login?redirect=/join/main`;
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      // We need the user's Spotify email — fetch it from the Spotify API via our server
      const emailRes = await fetch("/api/me/email");
      const { email } = await emailRes.json() as { email: string };

      const res = await fetch("/api/pod/request-join", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ podId, userEmail: email }),
      });
      const json = await res.json() as { status?: string; error?: string };

      if (!res.ok) {
        setError(json.error ?? "Something went wrong");
      } else if (json.status === "already_member") {
        window.location.href = "/dashboard";
      } else {
        setDone(true);
      }
    } catch {
      setError("Network error — try again");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center px-6 pb-12"
      style={{ backgroundColor: "var(--background)" }}
    >
      <div
        className="fixed inset-0 pointer-events-none"
        aria-hidden="true"
        style={{
          background:
            "radial-gradient(ellipse 60% 50% at 50% 0%, rgba(196,168,240,0.06) 0%, transparent 70%)",
        }}
      />

      <div className="relative z-10 w-full max-w-sm">
        <div className="flex flex-col items-center mb-8">
          <VinylLogo size={56} />
          <span className="text-white/30 text-xs tracking-widest uppercase mt-3">sonaara</span>
        </div>

        <div
          className="rounded-2xl p-6"
          style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}
        >
          {done || existingStatus === "pending" || existingStatus === "processing" ? (
            <>
              <p className="text-white font-semibold text-lg mb-2">Request sent ✓</p>
              <p className="text-white/40 text-sm">
                {existingStatus === "processing"
                  ? "Your request is being processed — you'll be able to log in shortly."
                  : `Your request to join ${podName} has been sent to the admin. You'll be able to log in once approved.`}
              </p>
            </>
          ) : existingStatus === "denied" ? (
            <>
              <p className="text-white font-semibold text-lg mb-2">Request declined</p>
              <p className="text-white/40 text-sm">
                Your request to join {podName} was not approved. Reach out to the pod admin for more info.
              </p>
            </>
          ) : isFull ? (
            <>
              <p className="text-white font-semibold text-lg mb-2">{podName} is full</p>
              <p className="text-white/40 text-sm">This pod has reached its member limit.</p>
            </>
          ) : (
            <>
              <p className="text-white font-semibold text-lg mb-1">
                Join {podName}
              </p>
              <p className="text-white/35 text-sm mb-6">
                {isLoggedIn
                  ? "Tap below to request access. The pod admin will approve you shortly."
                  : "Sign in with Spotify first, then request to join."}
              </p>

              {error && (
                <p className="text-red-400/70 text-xs mb-3">{error}</p>
              )}

              <button
                onClick={handleRequest}
                disabled={submitting}
                className="w-full py-3 rounded-xl text-sm font-semibold transition-all active:scale-[0.97] disabled:opacity-50"
                style={{ background: "rgba(196,168,240,0.2)", color: "rgba(196,168,240,1)" }}
              >
                {submitting
                  ? "Sending…"
                  : isLoggedIn
                  ? "Request to join"
                  : "Sign in with Spotify"}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
