"use client";

import { useState, useEffect, useCallback } from "react";
import Image from "next/image";
import { formatRelativeTime } from "@/lib/spotify";
import type { UserRecord } from "@/lib/store";

const LS_KEY = "sonaara_friends";

function loadFriendIds(): string[] {
  try {
    const raw = localStorage.getItem(LS_KEY);
    return raw ? (JSON.parse(raw) as string[]) : [];
  } catch {
    return [];
  }
}

function saveFriendIds(ids: string[]): void {
  localStorage.setItem(LS_KEY, JSON.stringify(ids));
}

export function FriendsSection({ currentUserId }: { currentUserId: string }) {
  const [friendIds, setFriendIds] = useState<string[]>([]);
  const [friendData, setFriendData] = useState<Record<string, UserRecord>>({});
  const [input, setInput] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    setMounted(true);
    setFriendIds(loadFriendIds());
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
    <section className="space-y-4 pt-2">
      <div className="flex items-center justify-between">
        <h2 className="text-white/40 text-xs font-medium tracking-widest uppercase">
          Friends
        </h2>
      </div>

      {/* Add friend */}
      <div className="flex gap-2">
        <input
          type="text"
          value={input}
          onChange={(e) => { setInput(e.target.value); setError(null); }}
          onKeyDown={(e) => e.key === "Enter" && addFriend()}
          placeholder="Friend's Spotify user ID"
          className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-2.5
                     text-white text-sm placeholder:text-white/25
                     focus:outline-none focus:border-white/25 transition-colors"
        />
        <button
          onClick={addFriend}
          className="px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/15
                     text-white text-sm font-medium transition-colors"
        >
          Add
        </button>
      </div>
      {error && <p className="text-red-400/70 text-xs -mt-2">{error}</p>}

      {/* Your ID */}
      <div className="flex items-center gap-2">
        <p className="text-white/20 text-xs">
          Your ID: <span className="font-mono text-white/35">{currentUserId}</span>
        </p>
        <button
          onClick={copyId}
          className="text-white/20 hover:text-white/50 text-xs transition-colors"
        >
          {copied ? "Copied!" : "Copy"}
        </button>
      </div>

      {/* Friend cards */}
      {friendIds.length === 0 ? (
        <div className="rounded-2xl border border-white/10 bg-white/5 p-6 text-center">
          <p className="text-white/30 text-sm">No friends added yet</p>
          <p className="text-white/15 text-xs mt-1">
            Share your ID above and add your friends&apos; IDs to see their Signatures
          </p>
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
  if (loading) {
    return (
      <div className="rounded-2xl border border-white/10 bg-white/5 p-4 animate-pulse">
        <div className="h-4 bg-white/10 rounded w-1/3 mb-3" />
        <div className="h-12 bg-white/5 rounded" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="rounded-2xl border border-white/10 bg-white/5 p-4 flex items-center justify-between">
        <div>
          <p className="text-white/40 text-sm font-mono">{userId}</p>
          <p className="text-white/20 text-xs mt-0.5">Hasn&apos;t opened Sonaara yet</p>
        </div>
        <button onClick={onRemove} className="text-white/20 hover:text-white/50 text-xs transition-colors">
          Remove
        </button>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-sm p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2.5">
          {data.userImage ? (
            <div className="relative w-7 h-7 flex-shrink-0">
              <Image
                src={data.userImage}
                alt={data.userName}
                fill
                className="rounded-full object-cover"
                sizes="28px"
              />
            </div>
          ) : (
            <div className="w-7 h-7 rounded-full bg-white/10 flex items-center justify-center text-xs text-white/60">
              {data.userName[0]?.toUpperCase() ?? "?"}
            </div>
          )}
          <span className="text-white text-sm font-medium">{data.userName}</span>
        </div>
        <button onClick={onRemove} className="text-white/20 hover:text-white/50 text-xs transition-colors">
          Remove
        </button>
      </div>

      {/* Signature */}
      {data.signature ? (
        <div className="grid grid-cols-3 gap-2 mb-3">
          {(
            [
              { emoji: data.signature.genre, label: data.signature.genreLabel, sub: "Genre" },
              { emoji: data.signature.mood, label: data.signature.moodLabel, sub: "Mood" },
              { emoji: data.signature.theme, label: data.signature.themeLabel, sub: "Theme" },
            ] as const
          ).map(({ emoji, label, sub }) => (
            <div key={sub} className="flex flex-col items-center gap-1 py-1">
              <span className="text-3xl leading-none select-none">{emoji}</span>
              <span className="text-white/70 text-xs font-medium text-center leading-tight">{label}</span>
              <span className="text-white/25 text-xs text-center">{sub}</span>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-white/25 text-xs mb-3">No signature for yesterday</p>
      )}

      {/* Last track */}
      {data.lastTrack && (
        <div className="flex items-center gap-2 border-t border-white/5 pt-3">
          {data.lastTrack.albumImageUrl && (
            <div className="relative w-7 h-7 flex-shrink-0">
              <Image
                src={data.lastTrack.albumImageUrl}
                alt={data.lastTrack.albumName}
                fill
                className="rounded object-cover"
                sizes="28px"
              />
            </div>
          )}
          <div className="min-w-0 flex-1">
            <p className="text-white/55 text-xs truncate">{data.lastTrack.name}</p>
            <p className="text-white/30 text-xs truncate">{data.lastTrack.artists.join(", ")}</p>
          </div>
        </div>
      )}

      <p className="text-white/15 text-xs mt-2">Updated {formatRelativeTime(data.updatedAt)}</p>
    </div>
  );
}
