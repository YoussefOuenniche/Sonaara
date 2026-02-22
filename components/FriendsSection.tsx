"use client";

import { useState, useEffect, useCallback } from "react";
import Image from "next/image";

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
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-white/10 flex-shrink-0" />
          <div className="flex-1 space-y-2">
            <div className="h-3.5 bg-white/10 rounded w-1/3" />
            <div className="h-3 bg-white/5 rounded w-1/2" />
          </div>
        </div>
      </div>
    );
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
          {data.userImage ? (
            <Image
              src={data.userImage}
              alt={data.userName}
              fill
              className="rounded-full object-cover"
              sizes="40px"
            />
          ) : (
            <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center text-base text-white/50">
              {data.userName[0]?.toUpperCase() ?? "?"}
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
