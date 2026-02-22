import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { CreatePodForm } from "./CreatePodForm";

export default async function CreatePodPage() {
  const session = await getSession();
  if (!session.accessToken) redirect("/api/auth/login");
  if (session.podId) redirect("/dashboard"); // already in a pod

  return (
    <div className="min-h-screen flex items-center justify-center px-6" style={{ backgroundColor: "var(--background)" }}>
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <p className="text-white/30 text-xs tracking-widest uppercase mb-1">sonaara</p>
          <h1
            className="text-white"
            style={{ fontFamily: "Georgia, 'Times New Roman', serif", fontSize: "28px", fontStyle: "italic", fontWeight: 700 }}
          >
            Create a pod
          </h1>
          <p className="text-white/35 text-sm mt-2">
            Your friend group gets its own Spotify app and shared discovery feed.
          </p>
        </div>
        <CreatePodForm userEmail={session.userEmail ?? ""} />
      </div>
    </div>
  );
}
