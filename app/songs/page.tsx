import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { getUser } from "@/lib/store";
import { Redis } from "@upstash/redis";
import { SongsView } from "@/components/SongsView";
import { BottomNav } from "@/components/BottomNav";

const redis = new Redis({
  url: process.env.KV_REST_API_URL!,
  token: process.env.KV_REST_API_TOKEN!,
});

export default async function SongsPage() {
  const session = await getSession();
  if (!session.accessToken) redirect("/");
  if (!session.userId) redirect("/");

  let user = await getUser(session.userId);

  // One-time cleanup: clear discoverLikes that were polluted by the bad migration
  if (user && !user.discoverLikesClean) {
    const cleaned = { ...user, discoverLikes: [], discoverLikesClean: true };
    await redis.set(`user:${session.userId}`, cleaned).catch(() => {});
    user = { ...user, discoverLikes: [] };
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: "var(--background)" }}>
      <SongsView
        likedTracks={user?.discoverLikes ?? []}
        skippedTracks={user?.skippedTracks ?? []}
      />
      <BottomNav active="songs" />
    </div>
  );
}
