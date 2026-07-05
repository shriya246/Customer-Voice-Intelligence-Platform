-- Per RICE_PRIORITIZATION.md: Impact and Confidence are auto-suggested but
-- always PM-overridable, and the override is sticky (not silently
-- recalculated away). Effort can never be inferred from feedback text at
-- all -- it's a real engineering estimate -- so it's a plain PM-set field
-- with a neutral default, not an override/suggestion pair like the other two.
alter table public.themes add column impact_override numeric;
alter table public.themes add column confidence_override numeric;
alter table public.themes add column effort numeric not null default 1;

-- Raw aggregates only -- the actual RICE formula (mapping these into
-- Impact/Confidence scales, applying overrides, dividing by Effort) lives
-- in application code (src/lib/scoring.ts), not here, so the scoring logic
-- itself is easy to read, test, and change without a migration.
--
-- Reach: distinct customers mentioning this theme in the last 90 days,
-- falling back to counting the item itself for feedback with no linked
-- customer (anonymous widget submissions) -- coalescing to the item's own
-- id makes each such item its own reach unit instead of collapsing them
-- all into a single "null customer" bucket.
create or replace function public.get_theme_stats(p_theme_id uuid)
returns table (item_count int, reach int, avg_sentiment float8, sentiment_stddev float8)
language sql
stable
as $$
  select
    count(*)::int as item_count,
    count(distinct coalesce(customer_id::text, id::text))::int as reach,
    avg(sentiment_score) as avg_sentiment,
    stddev(sentiment_score) as sentiment_stddev
  from public.feedback_items
  where theme_id = p_theme_id
    and created_at > now() - interval '90 days';
$$;

grant execute on function public.get_theme_stats(uuid) to authenticated;
