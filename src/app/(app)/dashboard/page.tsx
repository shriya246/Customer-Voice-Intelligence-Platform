import type { Metadata } from "next";
import { getCurrentMembership } from "@/lib/org";

export const metadata: Metadata = { title: "Dashboard — VoiceIQ Enterprise" };

export default async function DashboardPage() {
  const membership = await getCurrentMembership();

  return (
    <div>
      <h1 className="text-2xl font-semibold">Dashboard</h1>
      <p className="mt-2 text-sm text-gray-500">
        Signed in as a{membership?.role === "admin" ? "n" : ""} {membership?.role} of{" "}
        {membership?.orgName}.
      </p>
      <div className="mt-8 rounded-lg border border-dashed border-gray-300 p-8 text-center text-sm text-gray-500 dark:border-neutral-700">
        Feedback ingestion and the opportunity list land here next.
      </div>
    </div>
  );
}
