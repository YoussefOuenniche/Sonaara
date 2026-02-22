"use client";

import { useState, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import Image from "next/image";

import type { UserRecord } from "@/lib/store";

const LS_KEY = "sonaara_friends";

function migrateFromLocalStorage(): string[] {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return [];
    const ids = JSON.parse(raw) as string[];
    localStorage.removeItem(LS_KEY);
    return ids;
  } catch {
    return [];
  }
}

async function loadFriendIds(): Promise<string[]> {
  const res = await fetch("/api/friends/ids");
  const json = await res.json() as { ids: string[] };
  return json.ids ?? [];
}

async function saveFriendIds(ids: string[]): Promise<void> {
  await fetch("/api/friends/ids", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ids }),
  });
}

export function FriendsSection({ currentUserId }: { currentUserId: string }) {
  const [friendIds, setFriendIds] = useState<string[]>([]);
  const [friendData, setFriendData] = useState<Record<string, UserRecord>>({});
  const [input, setInput] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    setMounted(true);
    loadFriendIds().then((serverIds) => {
      // Migrate any locally stored IDs and merge them in
      const local = migrateFromLocalStorage();
      const merged = Array.from(new Set([...serverIds, ...local]));
      setFriendIds(merged);
      if (local.length > 0) saveFriendIds(merged);
    });
  }, []);

  const fetchFriendData = useCallback(async (ids: string[]) => {
    if (!ids.length) { setFriendData({}); return; }
    setLoading(true);
    try {
      const res = await fetch(`/api/friends/data?ids=${ids.join(",")}`);
      const json = await res.json() as { users: UserRecord[] };
      const map: Record<string, UserRecord> = {};
      for (const u of json.users) map[u.userId] = u;
      setFriendData(map);
    } catch {
      // non-fatal
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (mounted) fetchFriendData(friendIds);
  }, [mounted, friendIds, fetchFriendData]);

  function addFriend() {
    const id = input.trim();
    setError(null);
    if (!id) return;
    if (id === currentUserId) { setError("That's you!"); return; }
    if (friendIds.includes(id)) { setError("Already added"); return; }
    const next = [...friendIds, id];
    setFriendIds(next);
    saveFriendIds(next);
    setInput("");
  }

  function removeFriend(id: string) {
    const next = friendIds.filter((f) => f !== id);
    setFriendIds(next);
    saveFriendIds(next);
    setFriendData((prev) => { const d = { ...prev }; delete d[id]; return d; });
  }

  function copyId() {
    navigator.clipboard.writeText(currentUserId).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  if (!mounted) return null;

  return (
    <section className="space-y-3 pt-2">
      {/* Header row */}
      <div className="flex items-center justify-between">
        <h2 className="text-white/40 text-xs font-medium tracking-widest uppercase">Friends</h2>
        <div className="flex items-center gap-2">
          <button
            onClick={copyId}
            className="text-xs px-3 py-1.5 rounded-full font-medium transition-colors"
            style={{ background: "rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.4)" }}
          >
            {copied ? "Copied ✓" : "Copy my ID"}
          </button>
          <button
            onClick={() => { setShowModal(true); setError(null); }}
            className="text-xs px-3 py-1.5 rounded-full font-medium transition-colors"
            style={{ background: "rgba(196,168,240,0.1)", color: "rgba(196,168,240,0.7)" }}
          >
            + Add friend
          </button>
        </div>
      </div>

      {/* Friend cards */}
      {friendIds.length === 0 ? (
        <div className="rounded-2xl border border-white/10 bg-white/5 p-6 text-center">
          <p className="text-white/30 text-sm">No friends added yet</p>
          <p className="text-white/15 text-xs mt-1">Tap &quot;Add friend&quot; to see their signatures</p>
        </div>
      ) : (
        <div className="space-y-3">
          {friendIds.map((id) => (
            <FriendCard
              key={id}
              userId={id}
              data={friendData[id] ?? null}
              loading={loading && !friendData[id]}
              onRemove={() => removeFriend(id)}
            />
          ))}
        </div>
      )}

      {/* Add-friend modal — rendered via portal to escape parent stacking context */}
      {showModal && createPortal(
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-[60]"
            style={{ background: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)" }}
            onClick={() => { setShowModal(false); setError(null); setInput(""); }}
          />
          {/* Sheet */}
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
            <div className="flex items-center justify-between mb-1">
              <p className="text-white font-semibold text-lg">Add a friend</p>
              <button
                onClick={() => { setShowModal(false); setError(null); setInput(""); }}
                className="w-8 h-8 flex items-center justify-center rounded-full transition-colors"
                style={{ background: "rgba(255,255,255,0.07)", color: "rgba(255,255,255,0.4)" }}
                aria-label="Close"
              >
                ✕
              </button>
            </div>
            <p className="text-white/35 text-sm mb-5">Enter their Spotify user ID to see their Signature</p>

            <div className="flex gap-2 mb-3">
              <input
                type="text"
                value={input}
                onChange={(e) => { setInput(e.target.value); setError(null); }}
                onKeyDown={(e) => e.key === "Enter" && addFriend()}
                placeholder="Spotify user ID"
                autoFocus
                className="flex-1 rounded-xl px-4 py-3 text-white placeholder:text-white/25 focus:outline-none transition-colors"
                style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.12)", fontSize: 16 }}
              />
              <button
                onClick={addFriend}
                className="px-5 py-3 rounded-xl text-sm font-semibold transition-colors"
                style={{ background: "rgba(196,168,240,0.2)", color: "rgba(196,168,240,1)" }}
              >
                Add
              </button>
            </div>
            {error && <p className="text-red-400/70 text-xs mb-3">{error}</p>}
          </div>
        </>,
        document.body
      )}
    </section>
  );
}

function FriendCard({
  userId,
  data,
  loading,
  onRemove,
}: {
  userId: string;
  data: UserRecord | null;
  loading: boolean;
  onRemove: () => void;
}) {
  const [imgError, setImgError] = useState(false);
  if (loading) {
    return null;
  }

  if (!data) {
    return (
      <div className="rounded-2xl border border-white/10 bg-white/5 p-4 flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center text-white/20 text-sm flex-shrink-0">?</div>
        <div className="flex-1 min-w-0">
          <p className="text-white/40 text-sm font-mono truncate">{userId}</p>
          <p className="text-white/20 text-xs mt-0.5">Hasn&apos;t opened Sonaara yet</p>
        </div>
        <button onClick={onRemove} className="text-white/20 hover:text-white/50 transition-colors flex-shrink-0">✕</button>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-sm p-4">
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

        {/* Center: name + track */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1.5">
            <span className="text-white text-[15px] font-semibold truncate">{data.userName}</span>
            {data.signature ? (
              <span className="flex gap-1 bg-white/8 rounded-lg px-2 py-0.5 flex-shrink-0">
                <span className="text-lg leading-none select-none">{data.signature.genre}</span>
                <span className="text-lg leading-none select-none">{data.signature.mood}</span>
                <span className="text-lg leading-none select-none">{data.signature.theme}</span>
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

        {/* Remove */}
        <button onClick={onRemove} className="text-white/20 hover:text-white/50 transition-colors flex-shrink-0">✕</button>
      </div>
    </div>
  );
}
