import { notFound } from "next/navigation";
import { getPod, POD_MAX_MEMBERS } from "@/lib/pods";
import { JoinForm } from "./JoinForm";

export default async function JoinPodPage({
  params,
}: {
  params: Promise<{ podId: string }>;
}) {
  const { podId } = await params;
  const pod = await getPod(podId);

  if (!pod || pod.status !== "ready") notFound();

  const isFull = pod.memberIds.length >= POD_MAX_MEMBERS;

  return (
    <div className="min-h-screen flex items-center justify-center px-6" style={{ backgroundColor: "var(--background)" }}>
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <p className="text-white/30 text-xs tracking-widest uppercase mb-1">sonaara</p>
          <h1
            className="text-white"
            style={{ fontFamily: "Georgia, 'Times New Roman', serif", fontSize: "28px", fontStyle: "italic", fontWeight: 700 }}
          >
            {pod.podName}
          </h1>
          <p className="text-white/35 text-sm mt-2">You&apos;ve been invited to join this pod.</p>
        </div>
        <JoinForm podId={podId} podName={pod.podName} isFull={isFull} />
      </div>
    </div>
  );
}
