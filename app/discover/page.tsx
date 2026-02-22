import { redirect } from "next/navigation";
import { getSession, getAccessToken } from "@/lib/session";
import { DiscoverView } from "@/components/DiscoverView";
import { BottomNav } from "@/components/BottomNav";

export default async function DiscoverPage() {
  const session = await getSession();
  if (!session.accessToken) redirect("/");

  const accessToken = await getAccessToken();
  if (!accessToken) redirect("/api/auth/logout");

  return (
    <div className="min-h-screen" style={{ backgroundColor: "var(--background)" }}>
      <DiscoverView accessToken={accessToken} />
      <BottomNav active="discover" />
    </div>
  );
}
