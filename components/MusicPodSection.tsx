"use client";

import { useState, useCallback, useEffect } from "react";
import Image from "next/image";
import type { Pod, PodRequest } from "@/types";
import type { UserRecord } from "@/lib/store";

function resolveSignature(data: UserRecord): import("@/types").Signature | null {
  const history = data.signatureHistory ?? {};
  for (const key of Object.keys(history).sort().reverse()) {
    if (history[key] !== null) return history[key];
  }
  return data.signature ?? null;
}

// ── Member card ───────────────────────────────────────────────────────────────

function MemberCard({
  data,
  isHidden,
  isAdmin,
  currentUserId,
  onToggleHide,
  onRemove,
}: {
  data: UserRecord;
  isHidden: boolean;
  isAdmin: boolean;
  currentUserId: string;
  onToggleHide: () => void;
  onRemove: () => void;
}) {
  const [imgError, setImgError] = useState(false);
  const sig = resolveSignature(data);
  const isSelf = data.userId === currentUserId;

  return (
    <div
      className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-sm p-4"
      style={{ opacity: isHidden ? 0.45 : 1, transition: "opacity 0.2s" }}
    >
      <div className="flex items-center gap-3">
        {/* Avatar */}
        <div className="relative w-10 h-10 flex-shrink-0">
          {data.userImage && !imgError ? (
            <Image
              src={data.userImage}
              alt={data.userName}
              fill
              className="rounded-full object-cover"
              sizes="40px"
              onError={() => setImgError(true)}
            />
          ) : (
            <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center text-lg">
              🎵
            </div>
          )}
        </div>

        {/* Name + signature + last track */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1.5">
            <span className="text-white text-[15px] font-semibold truncate">
              {data.userName}
              {isSelf && <span className="text-white/30 text-xs font-normal ml-1">(you)</span>}
            </span>
            {sig ? (
              <span
                className="flex gap-1 flex-shrink-0"
                style={{ filter: "drop-shadow(0 0 7px rgba(255,255,255,0.6))" }}
              >
                <span className="text-lg leading-none select-none">{sig.genre}</span>
                <span className="text-lg leading-none select-none">{sig.mood}</span>
                <span className="text-lg leading-none select-none">{sig.theme}</span>
              </span>
            ) : (
              <span className="text-white/20 text-xs">no signature yet</span>
            )}
          </div>

          {data.lastTrack ? (
            <div className="flex items-center gap-2">
              {data.lastTrack.albumImageUrl && (
                <div className="relative w-4 h-4 flex-shrink-0">
                  <Image
                    src={data.lastTrack.albumImageUrl}
                    alt={data.lastTrack.albumName}
                    fill
                    className="rounded-sm object-cover"
                    sizes="16px"
                  />
                </div>
              )}
              <p className="text-white/40 text-xs truncate">
                {data.lastTrack.name}
                <span className="text-white/20"> · {data.lastTrack.artists[0]}</span>
              </p>
            </div>
          ) : (
            <p className="text-white/20 text-xs">No recent track</p>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 flex-shrink-0">
          {/* Hide/show toggle — members only, not for self */}
          {!isSelf && !isAdmin && (
            <button
              onClick={onToggleHide}
              className="text-white/25 hover:text-white/55 transition-colors text-sm"
              title={isHidden ? "Show in feed" : "Hide from feed"}
            >
              {isHidden ? "👁" : "🙈"}
            </button>
          )}
          {/* Admin remove */}
          {isAdmin && !isSelf && (
            <button
              onClick={onRemove}
              className="text-white/20 hover:text-red-400/60 transition-colors text-sm"
              title="Remove from pod"
            >
              ✕
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Pending request card (admin only) ────────────────────────────────────────

function RequestCard({
  req,
  onApprove,
  onDeny,
}: {
  req: PodRequest;
  onApprove: () => void;
  onDeny: () => void;
}) {
  const isProcessing = req.status === "processing";
  return (
    <div
      className="rounded-2xl border border-white/10 bg-white/5 p-4 flex items-center gap-3"
    >
      <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center text-white/30 text-sm flex-shrink-0">
        ?
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-white text-sm font-semibold truncate">{req.userName}</p>
        <p className="text-white/30 text-xs truncate">{req.userEmail}</p>
      </div>
      {isProcessing ? (
        <span className="text-white/30 text-xs">Adding…</span>
      ) : (
        <div className="flex gap-2">
          <button
            onClick={onDeny}
            className="px-3 py-1.5 rounded-lg text-xs font-medium transition-colors"
            style={{ background: "rgba(255,255,255,0.07)", color: "rgba(255,255,255,0.4)" }}
          >
            Deny
          </button>
          <button
            onClick={onApprove}
            className="px-3 py-1.5 rounded-lg text-xs font-medium transition-colors"
            style={{ background: "rgba(196,168,240,0.18)", color: "rgba(196,168,240,1)" }}
          >
            Approve
          </button>
        </div>
      )}
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export function MusicPodSection({
  pod,
  members,
  currentUserId,
  initialHidden,
}: {
  pod: Pod;
  members: UserRecord[];
  currentUserId: string;
  initialHidden: string[];
}) {
  const isAdmin = currentUserId === pod.adminUserId;
  const podId = pod.podId;

  const [hiddenIds, setHiddenIds] = useState<Set<string>>(new Set(initialHidden));
  const [pendingRequests, setPendingRequests] = useState<PodRequest[]>(pod.pendingRequests);
  const [memberList, setMemberList] = useState<UserRecord[]>(members);
  const [pendingRemoveId, setPendingRemoveId] = useState<string | null>(null);
  const [shareState, setShareState] = useState<"idle" | "copied">("idle");

  // Share / copy invite link
  async function handleShare() {
    const url = `${window.location.origin}/join/main`;
    if (navigator.share) {
      navigator.share({ title: `Join ${pod.podName} on Sonaara`, url }).catch(() => {});
    } else {
      await navigator.clipboard.writeText(url);
      setShareState("copied");
      setTimeout(() => setShareState("idle"), 2000);
    }
  }

  async function toggleHide(targetId: string) {
    const willHide = !hiddenIds.has(targetId);
    setHiddenIds((prev) => {
      const next = new Set(prev);
      willHide ? next.add(targetId) : next.delete(targetId);
      return next;
    });
    await fetch("/api/pod/hide-member", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ targetUserId: targetId, hidden: willHide }),
    }).catch(() => {});
  }

  async function handleApprove(userId: string) {
    setPendingRequests((prev) =>
      prev.map((r) => (r.userId === userId ? { ...r, status: "processing" as const } : r))
    );
    const res = await fetch("/api/pod/approve", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ podId, userId }),
    });
    if (!res.ok) {
      // Revert
      setPendingRequests((prev) =>
        prev.map((r) => (r.userId === userId ? { ...r, status: "pending" as const } : r))
      );
    }
  }

  async function handleDeny(userId: string) {
    setPendingRequests((prev) => prev.filter((r) => r.userId !== userId));
    await fetch("/api/pod/remove", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ podId, userId }),
    }).catch(() => {});
  }

  async function handleRemoveMember(userId: string) {
    setMemberList((prev) => prev.filter((m) => m.userId !== userId));
    setPendingRemoveId(null);
    await fetch("/api/pod/remove", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ podId, userId }),
    }).catch(() => {});
  }

  const pendingCount = pendingRequests.filter((r) => r.status === "pending").length;
  const removingUser = memberList.find((m) => m.userId === pendingRemoveId);

  return (
    <section className="space-y-3 pt-2">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h2 className="text-white/40 text-xs font-medium tracking-widest uppercase">
            {pod.podName}
          </h2>
          {isAdmin && pendingCount > 0 && (
            <span
              className="text-xs px-2 py-0.5 rounded-full font-semibold"
              style={{ background: "rgba(196,168,240,0.2)", color: "rgba(196,168,240,0.9)" }}
            >
              {pendingCount} pending
            </span>
          )}
        </div>
        {isAdmin && (
          <button
            onClick={handleShare}
            className="text-xs px-3 py-1.5 rounded-full font-medium transition-colors"
            style={{ background: "rgba(196,168,240,0.1)", color: "rgba(196,168,240,0.7)" }}
          >
            {shareState === "copied" ? "Copied ✓" : "Invite"}
          </button>
        )}
      </div>

      {/* Pending approval requests (admin only) */}
      {isAdmin && pendingRequests.length > 0 && (
        <div className="space-y-2">
          {pendingRequests.map((req) => (
            <RequestCard
              key={req.userId}
              req={req}
              onApprove={() => handleApprove(req.userId)}
              onDeny={() => handleDeny(req.userId)}
            />
          ))}
        </div>
      )}

      {/* Member cards */}
      {memberList.length === 0 ? (
        <div className="rounded-2xl border border-white/10 bg-white/5 p-6 text-center">
          <p className="text-white/30 text-sm">No members yet</p>
          <p className="text-white/15 text-xs mt-1">Share the invite link to get started</p>
        </div>
      ) : (
        <div className="space-y-3">
          {memberList.map((m) => (
            <MemberCard
              key={m.userId}
              data={m}
              isHidden={hiddenIds.has(m.userId)}
              isAdmin={isAdmin}
              currentUserId={currentUserId}
              onToggleHide={() => toggleHide(m.userId)}
              onRemove={() => setPendingRemoveId(m.userId)}
            />
          ))}
        </div>
      )}

      {/* Remove confirmation sheet */}
      {pendingRemoveId && (
        <>
          <div
            className="fixed inset-0 z-[60]"
            style={{ background: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)" }}
            onClick={() => setPendingRemoveId(null)}
          />
          <div
            className="fixed bottom-0 left-0 right-0 z-[60] rounded-t-3xl p-6"
            style={{
              background: "rgba(18,12,32,0.98)",
              border: "1px solid rgba(255,255,255,0.1)",
              borderBottom: "none",
              paddingBottom: "max(24px, env(safe-area-inset-bottom))",
            }}
          >
            <div className="w-10 h-1 rounded-full bg-white/20 mx-auto mb-6" />
            <p className="text-white font-semibold text-lg mb-1">Remove from pod?</p>
            <p className="text-white/35 text-sm mb-6">
              {removingUser?.userName
                ? `Remove ${removingUser.userName} from ${pod.podName}? They'll lose access and be removed from the Spotify allowlist.`
                : "Remove this member from the pod?"}
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setPendingRemoveId(null)}
                className="flex-1 py-3 rounded-xl text-sm font-semibold"
                style={{ background: "rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.6)" }}
              >
                Cancel
              </button>
              <button
                onClick={() => handleRemoveMember(pendingRemoveId)}
                className="flex-1 py-3 rounded-xl text-sm font-semibold"
                style={{ background: "rgba(239,68,68,0.2)", color: "rgba(248,113,113,1)" }}
              >
                Remove
              </button>
            </div>
          </div>
        </>
      )}
    </section>
  );
}
