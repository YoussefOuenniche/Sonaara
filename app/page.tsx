import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { VinylLogo } from "@/components/VinylLogo";
import { JoinPodInput } from "@/components/JoinPodInput";

export default async function HomePage() {
  const session = await getSession();

  if (session.accessToken) {
    redirect("/dashboard");
  }

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center px-6"
      style={{ backgroundColor: "var(--background)" }}
    >
      {/* Subtle radial glow */}
      <div
        className="absolute inset-0 pointer-events-none"
        aria-hidden="true"
        style={{
          background:
            "radial-gradient(ellipse 55% 45% at 50% 55%, rgba(196,168,240,0.07) 0%, transparent 70%)",
        }}
      />

      <div className="relative z-10 flex flex-col items-center gap-10 text-center max-w-sm w-full">
        {/* Vinyl logo + wordmark */}
        <div className="flex flex-col items-center gap-5">
          <VinylLogo size={96} />
          <div className="flex flex-col items-center gap-1">
            <span
              className="font-bold text-4xl tracking-tight"
              style={{ color: "var(--foreground)" }}
            >
              sonaara
            </span>
            <p style={{ color: "var(--lilac)", opacity: 0.45 }} className="text-sm">
              Your music, distilled.
            </p>
          </div>
        </div>

        {/* CTAs */}
        <div className="flex flex-col gap-3 w-full">
          <a
            href="/create-pod"
            className="w-full py-4 rounded-2xl text-sm font-semibold tracking-wide text-center transition-all hover:opacity-90 active:scale-[0.97]"
            style={{
              background: "rgba(196,168,240,0.15)",
              color: "rgba(196,168,240,1)",
              border: "1px solid rgba(196,168,240,0.2)",
            }}
          >
            Create a pod
          </a>

          <div className="flex items-center gap-3 py-1">
            <div className="flex-1 h-px" style={{ background: "rgba(255,255,255,0.06)" }} />
            <span className="text-xs" style={{ color: "rgba(255,255,255,0.2)" }}>or</span>
            <div className="flex-1 h-px" style={{ background: "rgba(255,255,255,0.06)" }} />
          </div>

          <JoinPodInput />
        </div>
      </div>
    </div>
  );
}
