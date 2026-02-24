import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { DiscoverView } from "@/components/DiscoverView";
import { BottomNav } from "@/components/BottomNav";

export default async function DiscoverPage() {
  const session = await getSession();
  if (!session.accessToken) redirect("/");

  return (
    <div className="min-h-screen" style={{ backgroundColor: "var(--background)" }}>
      <DiscoverView />
      <BottomNav active="discover" />
    </div>
  );
}
