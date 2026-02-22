"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import type { Pod } from "@/types";
import type { UserRecord } from "@/lib/store";

function MemberCard({ member }: { member: UserRecord }) {
  const sig = member.signature;
  const lastTrack = member.lastTrack;

  return (
    <div
      className="rounded-2xl p-4"
      style={{ background: "var(--card-bg)", border: "1px solid var(--card-border)" }}
    >
      <div className="flex items-center gap-3 mb-3">
        {member.userImage ? (
          <Image
            src={member.userImage}
            alt={member.userName}
            width={36}
            height={36}
            className="rounded-full object-cover"
          />
        ) : (
          <div
            className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-semibold"
            style={{ background: "rgba(196,168,240,0.15)", color: "var(--lilac)" }}
          >
            {member.userName?.[0]?.toUpperCase() ?? "?"}
          </div>
        )}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold truncate" style={{ color: "var(--foreground)" }}>
            {member.userName}
          </p>
          {sig && (
            <p className="text-xs mt-0.5" style={{ color: "var(--lilac)", opacity: 0.6 }}>
              {sig.genre} {sig.mood} {sig.theme}
            </p>
          )}
        </div>
      </div>

      {sig ? (
        <div
          className="rounded-xl px-3 py-2 mb-2"
          style={{ background: "rgba(196,168,240,0.06)" }}
        >
          <p className="text-xs" style={{ color: "var(--lilac)", opacity: 0.55 }}>
            {sig.genreLabel} · {sig.moodLabel} · {sig.themeLabel}
          </p>
        </div>
      ) : (
        <p className="text-xs mb-2" style={{ color: "var(--lilac)", opacity: 0.3 }}>
          No signature yet
        </p>
      )}

      {lastTrack && (
        <p className="text-xs truncate" style={{ color: "var(--foreground)", opacity: 0.3 }}>
          ♫ {lastTrack.name} — {lastTrack.artists.join(", ")}
        </p>
      )}
    </div>
  );
}

export function PodMembersSection({
  pod,
  members,
  currentUserId,
}: {
  pod: Pod;
  members: UserRecord[];
  currentUserId: string;
}) {
  const isAdmin = pod.adminUserId === currentUserId;
  const [approving, setApproving] = useState(false);
  const [approveMsg, setApproveMsg] = useState("");
  const [copied, setCopied] = useState(false);
  const [pendingEmails, setPendingEmails] = useState<string[] | null>(null);

  const joinLink =
    typeof window !== "undefined"
      ? `${window.location.origin}/join/${pod.podId}`
      : `/join/${pod.podId}`;

  // Fetch pending emails on mount (admin only)
  useEffect(() => {
    if (!isAdmin) return;
    fetch(`/api/pods/${pod.podId}/pending`)
      .then((r) => r.ok ? r.json() : null)
      .then((data) => { if (data?.emails) setPendingEmails(data.emails); })
      .catch(() => {});
  }, [isAdmin, pod.podId]);

  function copyJoinLink() {
    navigator.clipboard.writeText(joinLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  async function handleApprove() {
    setApproving(true);
    setApproveMsg("");
    const res = await fetch(`/api/pods/${pod.podId}/approve`, {
      method: "POST",
    }).catch(() => null);
    if (res?.ok) {
      const data = await res.json() as { emailsQueued: number };
      setApproveMsg(
        data.emailsQueued > 0
          ? `Adding ${data.emailsQueued} member${data.emailsQueued > 1 ? "s" : ""}…`
          : "No pending requests."
      );
      setPendingEmails([]);
    } else {
      setApproveMsg("Failed to trigger approval.");
    }
    setApproving(false);
  }

  return (
    <div
      className="rounded-2xl backdrop-blur-sm p-5"
      style={{ background: "var(--card-bg)", border: "1px solid var(--card-border)" }}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <p className="text-xs font-medium tracking-widest uppercase" style={{ color: "var(--lilac)", opacity: 0.5 }}>
            Pod · {members.length}/4
          </p>
          <p className="text-sm font-semibold mt-0.5" style={{ color: "var(--foreground)" }}>
            {pod.podName}
          </p>
        </div>
      </div>

      {/* Invite friends — admin only */}
      {isAdmin && (
        <div
          className="rounded-xl px-4 py-3 mb-4 flex items-center justify-between gap-3"
          style={{ background: "rgba(196,168,240,0.06)", border: "1px solid rgba(196,168,240,0.1)" }}
        >
          <div className="min-w-0">
            <p className="text-xs mb-1" style={{ color: "rgba(196,168,240,0.45)" }}>Invite friends</p>
            <p className="text-sm font-mono font-semibold tracking-wider truncate" style={{ color: "rgba(196,168,240,0.85)" }}>
              {pod.podId}
            </p>
          </div>
          <button
            onClick={copyJoinLink}
            className="text-xs px-3 py-1.5 rounded-full flex-shrink-0 transition-all hover:opacity-80"
            style={{ background: "rgba(196,168,240,0.12)", color: "rgba(196,168,240,0.7)" }}
          >
            {copied ? "Copied!" : "Copy link"}
          </button>
        </div>
      )}

      {/* Member list */}
      {members.length === 0 ? (
        <p className="text-sm py-2" style={{ color: "var(--lilac)", opacity: 0.3 }}>
          No other members yet.
        </p>
      ) : (
        <div className="flex flex-col gap-3">
          {members.map((m) => (
            <MemberCard key={m.userId} member={m} />
          ))}
        </div>
      )}

      {/* Admin: pending requests + approve */}
      {isAdmin && (
        <div className="mt-4 pt-4" style={{ borderTop: "1px solid rgba(196,168,240,0.08)" }}>

          {/* Pending list */}
          {pendingEmails && pendingEmails.length > 0 && (
            <div className="mb-3">
              <p className="text-xs mb-2" style={{ color: "var(--lilac)", opacity: 0.5 }}>
                {pendingEmails.length} pending request{pendingEmails.length > 1 ? "s" : ""}
              </p>
              <div className="flex flex-col gap-1.5">
                {pendingEmails.map((email) => (
                  <div
                    key={email}
                    className="rounded-xl px-3 py-2 flex items-center gap-2"
                    style={{ background: "rgba(196,168,240,0.06)" }}
                  >
                    <div
                      className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                      style={{ background: "rgba(196,168,240,0.4)" }}
                    />
                    <p className="text-xs truncate" style={{ color: "rgba(196,168,240,0.7)" }}>
                      {email}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {pendingEmails !== null && pendingEmails.length === 0 && !approveMsg && (
            <p className="text-xs mb-3" style={{ color: "var(--lilac)", opacity: 0.3 }}>
              No pending requests.
            </p>
          )}

          {(pendingEmails === null || pendingEmails.length > 0) && (
            <button
              onClick={handleApprove}
              disabled={approving || pendingEmails?.length === 0}
              className="w-full py-2.5 rounded-xl text-sm font-semibold transition-all active:scale-[0.97] hover:opacity-90 disabled:opacity-40"
              style={{ background: "rgba(196,168,240,0.15)", color: "rgba(196,168,240,0.9)" }}
            >
              {approving ? "Processing…" : `Approve ${pendingEmails?.length ? `${pendingEmails.length} ` : ""}request${pendingEmails?.length !== 1 ? "s" : ""}`}
            </button>
          )}

          {approveMsg && (
            <p className="text-xs mt-2 text-center" style={{ color: "rgba(196,168,240,0.5)" }}>
              {approveMsg}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
