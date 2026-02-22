import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { getUser, addDiscoverLike } from "@/lib/store";
import { SongsView } from "@/components/SongsView";
import { BottomNav } from "@/components/BottomNav";

export default async function SongsPage() {
  const session = await getSession();
  if (!session.accessToken) redirect("/");
  if (!session.userId) redirect("/");

  const user = await getUser(session.userId);

  // One-time migration: if discoverLikes is unset but likedTracks exists,
  // backfill discoverLikes from likedTracks so pre-push history isn't lost.
  let discoverLikes = user?.discoverLikes;
  if (!discoverLikes && user?.likedTracks?.length) {
    discoverLikes = user.likedTracks;
    await Promise.all(
      user.likedTracks.map((t) => addDiscoverLike(session.userId!, t))
    ).catch(() => {});
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: "var(--background)" }}>
      <SongsView
        likedTracks={discoverLikes ?? []}
        skippedTracks={user?.skippedTracks ?? []}
      />
      <BottomNav active="songs" />
    </div>
  );
}
