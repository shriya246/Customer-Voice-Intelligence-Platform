import type { Metadata } from "next";
import Link from "next/link";
import { getCurrentMembership } from "@/lib/org";

export const metadata: Metadata = { title: "Dashboard — VoiceIQ Enterprise" };

export default async function DashboardPage() {
  const membership = await getCurrentMembership();

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Dashboard</h1>
          <p className="mt-2 text-sm text-gray-500">
            Signed in as a{membership?.role === "admin" ? "n" : ""} {membership?.role} of{" "}
            {membership?.orgName}.
          </p>
        </div>
        {membership?.role !== "viewer" && (
          <Link
            href="/feedback/new"
            className="rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white dark:bg-white dark:text-gray-900"
          >
            Log feedback
          </Link>
        )}
      </div>
      <div className="mt-8 rounded-lg border border-dashed border-gray-300 p-8 text-center text-sm text-gray-500 dark:border-neutral-700">
        The feedback list and opportunity view land here next.
      </div>
    </div>
  );
}
