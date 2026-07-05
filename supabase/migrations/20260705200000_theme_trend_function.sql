-- Weekly-bucketed volume for a theme's feedback, most recent N weeks.
-- Plain (not security-definer) -- same reasoning as get_theme_stats, the
-- caller already has SELECT on their own org's feedback_items via RLS.
create or replace function public.get_theme_trend(p_theme_id uuid, p_weeks int default 8)
returns table (week_start date, item_count int)
language sql
stable
as $$
  select date_trunc('week', created_at)::date as week_start, count(*)::int as item_count
  from public.feedback_items
  where theme_id = p_theme_id
    and created_at > now() - (p_weeks || ' weeks')::interval
  group by week_start
  order by week_start;
$$;

grant execute on function public.get_theme_trend(uuid, int) to authenticated;
