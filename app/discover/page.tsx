import { redirect } from "next/navigation";
import { getAccessToken } from "@/lib/session";
import { DiscoverView } from "@/components/DiscoverView";
import { BottomNav } from "@/components/BottomNav";

export default async function DiscoverPage() {
  const accessToken = await getAccessToken();
  if (!accessToken) redirect("/");

  return (
    <div className="min-h-screen" style={{ backgroundColor: "var(--background)" }}>
      <DiscoverView accessToken={accessToken} />
      <BottomNav active="discover" />
    </div>
  );
}
