import type { Metadata } from "next";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getCurrentMembership } from "@/lib/org";
import { ProcessBacklogButton } from "./process-backlog-button";

export const metadata: Metadata = { title: "Dashboard — VoiceIQ Enterprise" };

const PAGE_SIZE = 20;
const NO_MATCH_ID = "00000000-0000-0000-0000-000000000000";

type FeedbackRow = {
  id: string;
  content: string;
  source: string;
  created_at: string;
  sentiment: string | null;
  channels: { name: string } | null;
  customers: { name: string | null } | null;
  feedback_item_tags: { tags: { name: string } | null }[];
  themes: { name: string | null } | null;
};

const SENTIMENT_STYLES: Record<string, string> = {
  very_negative: "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300",
  negative: "bg-orange-100 text-orange-800 dark:bg-orange-950 dark:text-orange-300",
  neutral: "bg-gray-100 text-gray-700 dark:bg-neutral-800 dark:text-gray-300",
  positive: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300",
  very_positive: "bg-emerald-200 text-emerald-900 dark:bg-emerald-900 dark:text-emerald-200",
};

type SearchParams = {
  channel?: string;
  tag?: string;
  theme?: string;
  from?: string;
  to?: string;
  q?: string;
  page?: string;
};

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;
  const membership = await getCurrentMembership();
  if (!membership) return null;

  const supabase = await createClient();
  const page = Math.max(1, Number(params.page) || 1);

  const filteredTheme = params.theme
    ? (await supabase.from("themes").select("name").eq("id", params.theme).single()).data
    : null;

  const [{ data: channels }, { data: tags }] = await Promise.all([
    supabase.from("channels").select("id, name").eq("org_id", membership.orgId).order("name"),
    supabase.from("tags").select("id, name").eq("org_id", membership.orgId).order("name"),
  ]);

  let matchingIds: string[] | null = null;
  if (params.tag) {
    const { data: tagLinks } = await supabase
      .from("feedback_item_tags")
      .select("feedback_item_id")
      .eq("tag_id", params.tag);
    matchingIds = (tagLinks ?? []).map((t) => t.feedback_item_id as string);
    if (matchingIds.length === 0) matchingIds = [NO_MATCH_ID];
  }

  const { count: unclusteredCount } = await supabase
    .from("feedback_items")
    .select("*", { count: "exact", head: true })
    .eq("org_id", membership.orgId)
    .or("theme_id.is.null,sentiment.is.null");

  let query = supabase
    .from("feedback_items")
    .select(
      "id, content, source, created_at, sentiment, channels(name), customers(name), feedback_item_tags(tags(name)), themes(name)",
      { count: "exact" }
    )
    .eq("org_id", membership.orgId);

  if (params.channel) query = query.eq("channel_id", params.channel);
  if (params.theme) query = query.eq("theme_id", params.theme);
  if (params.from) query = query.gte("created_at", params.from);
  if (params.to) query = query.lte("created_at", `${params.to}T23:59:59`);
  if (params.q) query = query.ilike("content", `%${params.q}%`);
  if (matchingIds) query = query.in("id", matchingIds);

  const { data, count } = await query
    .order("created_at", { ascending: false })
    .range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1);

  const items = (data ?? []) as unknown as FeedbackRow[];
  const totalPages = Math.max(1, Math.ceil((count ?? 0) / PAGE_SIZE));

  function pageHref(targetPage: number) {
    const sp = new URLSearchParams();
    if (params.channel) sp.set("channel", params.channel);
    if (params.tag) sp.set("tag", params.tag);
    if (params.theme) sp.set("theme", params.theme);
    if (params.from) sp.set("from", params.from);
    if (params.to) sp.set("to", params.to);
    if (params.q) sp.set("q", params.q);
    if (targetPage > 1) sp.set("page", String(targetPage));
    const qs = sp.toString();
    return qs ? `/dashboard?${qs}` : "/dashboard";
  }

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Dashboard</h1>
          <p className="mt-2 text-sm text-gray-500">
            Signed in as a{membership.role === "admin" ? "n" : ""} {membership.role} of{" "}
            {membership.orgName}.
          </p>
        </div>
        <div className="flex gap-3">
          <Link
            href="/opportunities"
            className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium dark:border-neutral-700"
          >
            Opportunities
          </Link>
          <Link
            href="/trends"
            className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium dark:border-neutral-700"
          >
            Trends
          </Link>
          {membership.role !== "viewer" && (
            <>
              <Link
                href="/feedback/import"
                className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium dark:border-neutral-700"
              >
                Import CSV
              </Link>
              <Link
                href="/feedback/new"
                className="rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white dark:bg-white dark:text-gray-900"
              >
                Log feedback
              </Link>
            </>
          )}
        </div>
      </div>

      <form method="get" className="mt-8 flex flex-wrap items-end gap-3">
        <div>
          <label htmlFor="q" className="block text-xs font-medium text-gray-500">
            Search
          </label>
          <input
            id="q"
            name="q"
            type="text"
            defaultValue={params.q ?? ""}
            placeholder="Search content..."
            className="mt-1 rounded-md border border-gray-300 px-3 py-1.5 text-sm dark:border-neutral-700 dark:bg-neutral-800"
          />
        </div>
        <div>
          <label htmlFor="channel" className="block text-xs font-medium text-gray-500">
            Channel
          </label>
          <select
            id="channel"
            name="channel"
            defaultValue={params.channel ?? ""}
            className="mt-1 rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm dark:border-neutral-700 dark:bg-neutral-800"
          >
            <option value="">All channels</option>
            {(channels ?? []).map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="tag" className="block text-xs font-medium text-gray-500">
            Tag
          </label>
          <select
            id="tag"
            name="tag"
            defaultValue={params.tag ?? ""}
            className="mt-1 rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm dark:border-neutral-700 dark:bg-neutral-800"
          >
            <option value="">All tags</option>
            {(tags ?? []).map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="from" className="block text-xs font-medium text-gray-500">
            From
          </label>
          <input
            id="from"
            name="from"
            type="date"
            defaultValue={params.from ?? ""}
            className="mt-1 rounded-md border border-gray-300 px-3 py-1.5 text-sm dark:border-neutral-700 dark:bg-neutral-800"
          />
        </div>
        <div>
          <label htmlFor="to" className="block text-xs font-medium text-gray-500">
            To
          </label>
          <input
            id="to"
            name="to"
            type="date"
            defaultValue={params.to ?? ""}
            className="mt-1 rounded-md border border-gray-300 px-3 py-1.5 text-sm dark:border-neutral-700 dark:bg-neutral-800"
          />
        </div>
        <button
          type="submit"
          className="rounded-md bg-gray-900 px-4 py-1.5 text-sm font-medium text-white dark:bg-white dark:text-gray-900"
        >
          Filter
        </button>
        {(params.channel || params.tag || params.theme || params.from || params.to || params.q) && (
          <Link href="/dashboard" className="text-sm text-gray-500 underline">
            Clear
          </Link>
        )}
      </form>

      {membership.role !== "viewer" && (
        <div className="mt-4">
          <ProcessBacklogButton unclusteredCount={unclusteredCount ?? 0} />
        </div>
      )}

      {params.theme && (
        <p className="mt-4 text-sm text-gray-500">
          Showing feedback for theme:{" "}
          <span className="font-medium text-gray-900 dark:text-gray-100">
            {filteredTheme?.name ?? "unlabeled theme"}
          </span>
        </p>
      )}

      <p className="mt-4 text-sm text-gray-500">{count ?? 0} result{count === 1 ? "" : "s"}</p>

      {items.length === 0 ? (
        <div className="mt-4 rounded-lg border border-dashed border-gray-300 p-8 text-center text-sm text-gray-500 dark:border-neutral-700">
          No feedback yet — log some, import a CSV, or embed the widget.
        </div>
      ) : (
        <div className="mt-4 overflow-x-auto rounded-md border border-gray-200 dark:border-neutral-800">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-gray-200 text-gray-500 dark:border-neutral-800">
                <th className="p-3 font-normal">Content</th>
                <th className="p-3 font-normal">Sentiment</th>
                <th className="p-3 font-normal">Theme</th>
                <th className="p-3 font-normal">Channel</th>
                <th className="p-3 font-normal">Customer</th>
                <th className="p-3 font-normal">Tags</th>
                <th className="p-3 font-normal">Source</th>
                <th className="p-3 font-normal">Date</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.id} className="border-b border-gray-100 dark:border-neutral-800">
                  <td className="max-w-sm p-3">
                    <span className="line-clamp-2">{item.content}</span>
                  </td>
                  <td className="p-3 whitespace-nowrap">
                    {item.sentiment ? (
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs ${SENTIMENT_STYLES[item.sentiment] ?? ""}`}
                      >
                        {item.sentiment.replace("_", " ")}
                      </span>
                    ) : (
                      <span className="text-gray-400">—</span>
                    )}
                  </td>
                  <td className="p-3 whitespace-nowrap">
                    {item.themes?.name ?? (
                      <span className="text-gray-400 italic">
                        {item.themes ? "unlabeled" : "unclustered"}
                      </span>
                    )}
                  </td>
                  <td className="p-3 whitespace-nowrap">{item.channels?.name ?? "—"}</td>
                  <td className="p-3 whitespace-nowrap">{item.customers?.name ?? "—"}</td>
                  <td className="p-3">
                    {item.feedback_item_tags
                      .map((t) => t.tags?.name)
                      .filter(Boolean)
                      .join(", ") || "—"}
                  </td>
                  <td className="p-3 whitespace-nowrap text-gray-500">{item.source}</td>
                  <td className="p-3 whitespace-nowrap text-gray-500">
                    {new Date(item.created_at).toLocaleDateString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {totalPages > 1 && (
        <div className="mt-4 flex items-center gap-4 text-sm">
          {page > 1 ? (
            <Link href={pageHref(page - 1)} className="underline">
              ← Previous
            </Link>
          ) : (
            <span className="text-gray-300">← Previous</span>
          )}
          <span className="text-gray-500">
            Page {page} of {totalPages}
          </span>
          {page < totalPages ? (
            <Link href={pageHref(page + 1)} className="underline">
              Next →
            </Link>
          ) : (
            <span className="text-gray-300">Next →</span>
          )}
        </div>
      )}
    </div>
  );
}
