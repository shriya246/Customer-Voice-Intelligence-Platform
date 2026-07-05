import Link from "next/link";

export default function Home() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center bg-gray-50 px-4 dark:bg-neutral-950">
      <div className="w-full max-w-2xl text-center">
        <h1 className="text-4xl font-semibold tracking-tight">
          VoiceIQ Enterprise
        </h1>
        <p className="mt-4 text-lg text-gray-600 dark:text-gray-400">
          Turn scattered customer feedback — tickets, reviews, surveys, call
          notes — into a continuously updated, prioritized product
          opportunity map.
        </p>
        <div className="mt-8 flex items-center justify-center gap-4">
          <Link
            href="/signup"
            className="rounded-md bg-gray-900 px-5 py-2.5 text-sm font-medium text-white dark:bg-white dark:text-gray-900"
          >
            Get started
          </Link>
          <Link
            href="/login"
            className="rounded-md border border-gray-300 px-5 py-2.5 text-sm font-medium dark:border-neutral-700"
          >
            Sign in
          </Link>
        </div>
      </div>
    </div>
  );
}
