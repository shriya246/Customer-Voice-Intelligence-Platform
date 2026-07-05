-- Cosine distance (pgvector's <=> operator) between a candidate embedding
-- and every theme's centroid in the org, closest first. security invoker
-- (the default) is correct here, not definer -- the caller already has
-- SELECT on themes in their own org via RLS, so this is just a convenience
-- wrapper around a query they could already run directly, not a privileged
-- operation crossing a trust boundary.
create or replace function public.find_nearest_theme(p_org_id uuid, p_embedding vector(384))
returns table (theme_id uuid, distance float8)
language sql
stable
as $$
  select id, (centroid <=> p_embedding)::float8 as distance
  from public.themes
  where org_id = p_org_id
  order by centroid <=> p_embedding
  limit 1;
$$;

grant execute on function public.find_nearest_theme(uuid, vector) to authenticated;
