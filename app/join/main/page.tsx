import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { getPod } from "@/lib/pods";
import { JoinClient } from "./JoinClient";

export default async function JoinPage() {
  const podId = process.env.POD_ID ?? "main";
  const pod = await getPod(podId);

  if (!pod) redirect("/");

  const session = await getSession();

  // Already a member → go to dashboard
  if (session.userId && pod.memberIds.includes(session.userId)) {
    redirect("/dashboard");
  }

  // Find existing request status if logged in
  const existingRequest = session.userId
    ? pod.pendingRequests.find((r) => r.userId === session.userId) ?? null
    : null;

  return (
    <JoinClient
      podId={podId}
      podName={pod.podName}
      isFull={pod.memberIds.length >= 5}
      isLoggedIn={!!session.userId}
      userEmail={session.userId ? null : null} // filled client-side after OAuth
      existingStatus={existingRequest?.status ?? null}
    />
  );
}
