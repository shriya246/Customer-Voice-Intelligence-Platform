import type { Metadata } from "next";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getCurrentMembership } from "@/lib/org";
import { ProcessBacklogButton } from "./process-backlog-button";
import { PageHeader } from "@/components/ui/page-header";
import { Button, ButtonLink } from "@/components/ui/button";
import { Card, EmptyState } from "@/components/ui/card";
import { SentimentBadge } from "@/components/ui/badge";
import { Input, Select, Label } from "@/components/ui/input";

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

  const hasFilters = Boolean(
    params.channel || params.tag || params.theme || params.from || params.to || params.q
  );

  return (
    <div>
      <PageHeader
        title="Dashboard"
        description={`Signed in as a${membership.role === "admin" ? "n" : ""} ${membership.role} of ${membership.orgName}.`}
        action={
          membership.role !== "viewer" ? (
            <div className="flex gap-2">
              <ButtonLink href="/feedback/import" variant="secondary" size="sm">
                Import CSV
              </ButtonLink>
              <ButtonLink href="/feedback/new" size="sm">
                Log feedback
              </ButtonLink>
            </div>
          ) : undefined
        }
      />

      {membership.role !== "viewer" && <ProcessBacklogButton unclusteredCount={unclusteredCount ?? 0} />}

      <Card className="animate-slide-up p-4" style={{ animationDelay: "40ms" }}>
        <form method="get" className="flex flex-wrap items-end gap-3">
          <div>
            <Label htmlFor="q" className="text-xs">
              Search
            </Label>
            <Input
              id="q"
              name="q"
              type="text"
              defaultValue={params.q ?? ""}
              placeholder="Search content…"
              className="w-48"
            />
          </div>
          <div>
            <Label htmlFor="channel" className="text-xs">
              Channel
            </Label>
            <Select id="channel" name="channel" defaultValue={params.channel ?? ""}>
              <option value="">All channels</option>
              {(channels ?? []).map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <Label htmlFor="tag" className="text-xs">
              Tag
            </Label>
            <Select id="tag" name="tag" defaultValue={params.tag ?? ""}>
              <option value="">All tags</option>
              {(tags ?? []).map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <Label htmlFor="from" className="text-xs">
              From
            </Label>
            <Input id="from" name="from" type="date" defaultValue={params.from ?? ""} />
          </div>
          <div>
            <Label htmlFor="to" className="text-xs">
              To
            </Label>
            <Input id="to" name="to" type="date" defaultValue={params.to ?? ""} />
          </div>
          <Button type="submit" size="md">
            Filter
          </Button>
          {hasFilters && (
            <ButtonLink href="/dashboard" variant="ghost" size="md">
              Clear
            </ButtonLink>
          )}
        </form>
      </Card>

      {params.theme && (
        <p className="mt-4 text-sm text-muted-foreground">
          Showing feedback for theme:{" "}
          <span className="font-medium text-foreground">{filteredTheme?.name ?? "unlabeled theme"}</span>
        </p>
      )}

      <p className="mt-4 text-sm text-muted-foreground">
        {count ?? 0} result{count === 1 ? "" : "s"}
      </p>

      {items.length === 0 ? (
        <div className="mt-4">
          <EmptyState
            title="No feedback yet"
            description="Log some, import a CSV, or embed the widget to start collecting feedback."
          />
        </div>
      ) : (
        <Card className="mt-4 animate-slide-up overflow-x-auto p-0" style={{ animationDelay: "80ms" }}>
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-border text-muted-foreground">
                <th className="p-3 font-medium">Content</th>
                <th className="p-3 font-medium">Sentiment</th>
                <th className="p-3 font-medium">Theme</th>
                <th className="p-3 font-medium">Channel</th>
                <th className="p-3 font-medium">Customer</th>
                <th className="p-3 font-medium">Tags</th>
                <th className="p-3 font-medium">Source</th>
                <th className="p-3 font-medium">Date</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr
                  key={item.id}
                  className="border-b border-border last:border-0 transition-colors hover:bg-surface-hover"
                >
                  <td className="max-w-sm p-3">
                    <span className="line-clamp-2">{item.content}</span>
                  </td>
                  <td className="p-3 whitespace-nowrap">
                    <SentimentBadge sentiment={item.sentiment} />
                  </td>
                  <td className="p-3 whitespace-nowrap">
                    {item.themes?.name ?? (
                      <span className="italic text-muted-foreground">
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
                  <td className="p-3 whitespace-nowrap text-muted-foreground">{item.source}</td>
                  <td className="p-3 whitespace-nowrap text-muted-foreground">
                    {new Date(item.created_at).toLocaleDateString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}

      {totalPages > 1 && (
        <div className="mt-4 flex items-center gap-4 text-sm">
          {page > 1 ? (
            <Link href={pageHref(page - 1)} className="font-medium text-primary hover:text-primary-hover">
              ← Previous
            </Link>
          ) : (
            <span className="text-muted-foreground/50">← Previous</span>
          )}
          <span className="text-muted-foreground">
            Page {page} of {totalPages}
          </span>
          {page < totalPages ? (
            <Link href={pageHref(page + 1)} className="font-medium text-primary hover:text-primary-hover">
              Next →
            </Link>
          ) : (
            <span className="text-muted-foreground/50">Next →</span>
          )}
        </div>
      )}
    </div>
  );
}
