import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { getSession, getAccessToken } from "@/lib/session";
import { upsertUser, getUser, setLikedTracks, getUsers } from "@/lib/store";
import { getPod } from "@/lib/pods";
import {
  getLastPlayedTrack,
  getYesterdayTracks,
  getYesterdayTracksWithGenres,
  getAudioFeatures,
  aggregateAudioFeatures,
  getRecentTracksGrouped,
  getDayKey,
  getLikedTracks,
} from "@/lib/spotify";
import { generateSignature } from "@/lib/claude";
import { LastPlayedCard } from "@/components/LastPlayedCard";
import { SignatureCard } from "@/components/SignatureCard";
import { FriendsSection } from "@/components/FriendsSection";
import { PodMembersSection } from "@/components/PodMembersSection";
import { BottomNav } from "@/components/BottomNav";
import type { Signature, Track, TrackWithGenres } from "@/types";

export default async function DashboardPage() {
  const session = await getSession();
  if (!session.accessToken) redirect("/");

  const accessToken = await getAccessToken();
  if (!accessToken) redirect("/api/auth/logout");

  const cookieStore = await cookies();
  const tz = decodeURIComponent(cookieStore.get("sonaara_tz")?.value ?? "UTC");

  const displayName = (session.userName ?? "there").split(" ")[0];
  const userId = session.userId ?? "";
  const yesterdayKey = getDayKey(1, tz);

  // Fetch in parallel: stored user, last played, yesterday's tracks, recent grouped, liked tracks
  const [existingUser, lastTrack, yesterdayRawTracks, recentGrouped, likedTracks] = await Promise.all([
    userId ? getUser(userId) : Promise.resolve(null),
    getLastPlayedTrack(accessToken).catch(() => null),
    getYesterdayTracks(accessToken, tz).catch(() => []),
    getRecentTracksGrouped(accessToken, tz).catch(() => ({} as Record<string, Track[]>)),
    getLikedTracks(accessToken).catch(() => []),
  ]);

  // Clean stored history (removes any "undefined" or malformed keys)
  const storedHistory: Record<string, Signature | null> =
    Object.fromEntries(
      Object.entries(existingUser?.signatureHistory ?? {}).filter(
        ([k]) => /^\d{4}-\d{2}-\d{2}$/.test(k)
      )
    );

  // ── Today's signature (yesterday's listening) ────────────────────────────
  const todayCached = yesterdayKey in storedHistory;
  let todaySignature: Signature | null = todayCached
    ? (storedHistory[yesterdayKey] ?? null)
    : null;
  let trackCount = 0;

  if (!todayCached && yesterdayRawTracks.length > 0) {
    try {
      const [tracksWithGenres, audioFeaturesRaw] = await Promise.all([
        getYesterdayTracksWithGenres(yesterdayRawTracks, accessToken),
        getAudioFeatures(yesterdayRawTracks.map((t) => t.id), accessToken).catch(() => []),
      ]);
      const audioFeatures = aggregateAudioFeatures(audioFeaturesRaw);
      todaySignature = await generateSignature(tracksWithGenres, audioFeatures);
      trackCount = yesterdayRawTracks.length;
    } catch {
      // signature generation failed
    }
  }

  // ── Backfill: generate signatures for past 5 days not yet in history ─────
  // Keys for days 2–6 ago (i.e. all "history" days, not including yesterday)
  const pastDayKeys = [2, 3, 4, 5, 6].map((n) => ({ n, key: getDayKey(n, tz) }));
  const missingKeys = pastDayKeys.filter(({ key }) => !(key in storedHistory));

  const backfillHistory: Record<string, Signature | null> = {};

  if (missingKeys.length > 0) {
    // Generate signatures for all missing days in parallel using already-fetched grouped data
    const results = await Promise.allSettled(
      missingKeys.map(async ({ key }) => {
        const dayTracks = recentGrouped[key] ?? [];
        if (!dayTracks.length) return { key, sig: null };
        // Use tracks without genre enrichment for backfill (avoids N extra API calls)
        const withGenres: TrackWithGenres[] = dayTracks.map((t) => ({
          ...t,
          genres: [],
        }));
        const sig = await generateSignature(withGenres, null).catch(() => null);
        return { key, sig };
      })
    );

    for (const r of results) {
      if (r.status === "fulfilled") backfillHistory[r.value.key] = r.value.sig;
    }
  }

  // Merge everything: stored history + backfill + today
  const fullHistory: Record<string, Signature | null> = {
    ...storedHistory,
    ...backfillHistory,
    [yesterdayKey]: todaySignature,
  };

  // ── Pod data (if user is in a pod) ──────────────────────────────────────
  let podData: { pod: import("@/types").Pod; members: import("@/lib/store").UserRecord[] } | null = null;
  if (session.podId) {
    const pod = await getPod(session.podId).catch(() => null);
    if (pod) {
      const otherMemberIds = pod.memberIds.filter((id) => id !== userId);
      const members = otherMemberIds.length ? await getUsers(otherMemberIds).catch(() => []) : [];
      podData = { pod, members };
    }
  }

  // Persist to store (awaited so the write completes before the response is sent)
  if (userId) {
    await Promise.all([
      upsertUser(
        {
          userId,
          userName: session.userName ?? "Unknown",
          userImage: session.userImage ?? null,
          updatedAt: new Date().toISOString(),
          signature: todaySignature,
          lastTrack,
          timezone: tz,
        },
        fullHistory
      ).catch(() => {}),
      likedTracks.length > 0
        ? setLikedTracks(userId, likedTracks).catch(() => {})
        : Promise.resolve(),
    ]);
  }

  // History passed to SignatureCard excludes today's key (component adds it back)
  const historyForCard: Record<string, Signature | null> = Object.fromEntries(
    Object.entries(fullHistory).filter(([k]) => k !== yesterdayKey)
  );

  // Tracks per day: merge recent grouped + yesterday's tracks under the correct key
  const tracksPerDay: Record<string, Track[]> = {
    ...recentGrouped,
    [yesterdayKey]: yesterdayRawTracks,
  };

  return (
    <div className="min-h-screen" style={{ backgroundColor: "var(--background)" }}>
      <div
        className="fixed inset-0 pointer-events-none"
        aria-hidden="true"
        style={{
          background:
            "radial-gradient(ellipse 60% 50% at 50% 0%, rgba(196,168,240,0.05) 0%, transparent 70%)",
        }}
      />

      <main className="relative z-10 max-w-md mx-auto px-6 pt-10 pb-28 space-y-5">
        <div>
          <h1 className="text-2xl font-semibold" style={{ color: "var(--foreground)" }}>
            Hey, {displayName}
          </h1>
          <p className="text-sm mt-1" style={{ color: "var(--lilac)", opacity: 0.4 }}>
            Here&apos;s your musical snapshot
          </p>
        </div>

        {/* 1. My signature — first */}
        <SignatureCard
          latestKey={yesterdayKey}
          latestSignature={todaySignature}
          latestTrackCount={trackCount}
          history={historyForCard}
          tracksPerDay={tracksPerDay}
        />

        {/* 2. Pod members OR manual friends */}
        {podData ? (
          <PodMembersSection
            pod={podData.pod}
            members={podData.members}
            currentUserId={userId}
          />
        ) : (
          userId && <FriendsSection currentUserId={userId} />
        )}

        {/* 3. Last played — bottom */}
        {lastTrack ? (
          <LastPlayedCard track={lastTrack} />
        ) : (
          <div
            className="rounded-2xl backdrop-blur-sm p-6"
            style={{ background: "var(--card-bg)", border: "1px solid var(--card-border)" }}
          >
            <p className="text-xs font-medium tracking-widest uppercase mb-2"
              style={{ color: "var(--lilac)", opacity: 0.5 }}>
              Last Played
            </p>
            <p className="text-sm" style={{ color: "var(--lilac)", opacity: 0.35 }}>
              Nothing found recently
            </p>
          </div>
        )}

        {/* 4. Footer — centered wordmark + sign out */}
        <div className="flex flex-col items-center gap-1 pt-2 pb-2">
          <span className="font-bold text-sm tracking-tight" style={{ color: "var(--foreground)", opacity: 0.3 }}>
            sonaara
          </span>
          <a
            href="/api/auth/logout"
            className="text-xs transition-opacity hover:opacity-60"
            style={{ color: "var(--lilac)", opacity: 0.25 }}
          >
            sign out
          </a>
        </div>
      </main>

      <BottomNav active="home" />
    </div>
  );
}
