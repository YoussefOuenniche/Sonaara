import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { getUser, markDiscoverLikesClean } from "@/lib/store";
import { SongsView } from "@/components/SongsView";
import { BottomNav } from "@/components/BottomNav";

export default async function SongsPage() {
  const session = await getSession();
  if (!session.accessToken) redirect("/");
  if (!session.userId) redirect("/");

  let user = await getUser(session.userId);

  // One-time cleanup: clear discoverLikes that were polluted by the bad migration
  if (user && !user.discoverLikesClean) {
    await markDiscoverLikesClean(session.userId).catch(() => {});
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
