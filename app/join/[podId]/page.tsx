import { notFound } from "next/navigation";
import { getSession } from "@/lib/session";
import { getPod, POD_MAX_MEMBERS } from "@/lib/pods";
import { JoinForm } from "./JoinForm";

export default async function JoinPodPage({
  params,
  searchParams,
}: {
  params: Promise<{ podId: string }>;
  searchParams: Promise<{ pending?: string }>;
}) {
  const { podId } = await params;
  const { pending } = await searchParams;
  const pod = await getPod(podId);

  if (!pod || pod.status !== "ready") notFound();

  const session = await getSession();
  const isFull = pod.memberIds.length >= POD_MAX_MEMBERS;
  const isPending = pending === "1";
  const userEmail = session.userEmail ?? null;

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
        <JoinForm podId={podId} podName={pod.podName} isFull={isFull} isPending={isPending} userEmail={userEmail} />
      </div>
    </div>
  );
}
