"use client";

export function JoinForm({
  podId,
  podName,
  isFull,
  isPending,
  isMember,
}: {
  podId: string;
  podName: string;
  isFull: boolean;
  isPending: boolean;
  isMember: boolean;
}) {
  const cardStyle = {
    background: "rgba(255,255,255,0.04)",
    border: "1px solid rgba(255,255,255,0.08)",
  };

  // Already a member — send them straight to dashboard
  if (isMember) {
    return (
      <div className="rounded-2xl p-6 flex flex-col gap-4 text-center" style={cardStyle}>
        <p className="text-white font-semibold">You&apos;re already in this pod.</p>
        <a
          href="/dashboard"
          className="w-full py-3 rounded-xl text-sm font-semibold tracking-wide text-center transition-all active:scale-[0.97] hover:opacity-90"
          style={{ background: "rgba(196,168,240,0.2)", color: "rgba(196,168,240,1)" }}
        >
          Go to dashboard →
        </a>
      </div>
    );
  }

  // Request already sent — waiting for admin to approve
  if (isPending) {
    return (
      <div className="rounded-2xl p-6 flex flex-col gap-4 text-center" style={cardStyle}>
        <p className="text-white font-semibold mb-1">Request sent!</p>
        <p className="text-white/40 text-sm">
          Come back here once the {podName} admin approves you — we&apos;ll log you straight in.
        </p>
        <a
          href={`/join/${podId}`}
          className="w-full py-3 rounded-xl text-sm font-semibold tracking-wide text-center transition-all active:scale-[0.97] hover:opacity-90 mt-2"
          style={{ background: "rgba(196,168,240,0.12)", color: "rgba(196,168,240,0.7)" }}
        >
          Check approval status →
        </a>
      </div>
    );
  }

  // Pod is full
  if (isFull) {
    return (
      <div className="rounded-2xl p-6 text-center" style={cardStyle}>
        <p className="text-white/60 font-semibold mb-1">Pod is full</p>
        <p className="text-white/30 text-sm">{podName} has reached its member limit.</p>
      </div>
    );
  }

  // Default — one button does everything: request if new, login if approved
  return (
    <div className="rounded-2xl p-6 flex flex-col gap-3" style={cardStyle}>
      <p className="text-white/35 text-sm text-center mb-1">
        Continue with Spotify to request access.<br />
        If you&apos;re already approved, you&apos;ll be logged in directly.
      </p>
      <a
        href={`/api/auth/login?join=${podId}`}
        className="w-full py-3 rounded-xl text-sm font-semibold tracking-wide text-center transition-all active:scale-[0.97] hover:opacity-90"
        style={{ background: "rgba(196,168,240,0.2)", color: "rgba(196,168,240,1)" }}
      >
        Continue with Spotify →
      </a>
    </div>
  );
}
