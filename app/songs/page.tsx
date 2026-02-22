import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { getUser } from "@/lib/store";
import { SongsView } from "@/components/SongsView";
import { BottomNav } from "@/components/BottomNav";

export default async function SongsPage() {
  const session = await getSession();
  if (!session.accessToken) redirect("/");
  if (!session.userId) redirect("/");

  const user = await getUser(session.userId);

  return (
    <div className="min-h-screen" style={{ backgroundColor: "var(--background)" }}>
      <SongsView
        likedTracks={user?.likedTracks ?? []}
        skippedTracks={user?.skippedTracks ?? []}
      />
      <BottomNav active="songs" />
    </div>
  );
}
