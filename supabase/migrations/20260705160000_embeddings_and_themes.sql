-- sentence-transformers/all-MiniLM-L6-v2 via Hugging Face's Inference API --
-- 384 dimensions, free tier, fast enough for per-item embedding at ingest
-- time. Picking one fixed model/dimension now; changing models later would
-- mean re-embedding every existing row (the vector column is dimension-locked).
create extension if not exists vector;

alter table public.feedback_items add column embedding vector(384);

-- A theme's centroid is the running mean of its members' embeddings, kept
-- up to date incrementally as items join (see ARCHITECTURE.md) rather than
-- recomputed from scratch on every assignment -- name/summary start null
-- and get filled in by the Sprint-2 "AI-generated theme labels" step, which
-- is deliberately a separate migration/feature from clustering itself.
create table public.themes (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations (id) on delete cascade,
  name text,
  summary text,
  centroid vector(384) not null,
  item_count int not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index themes_org_id_idx on public.themes (org_id);

alter table public.feedback_items add column theme_id uuid references public.themes (id) on delete set null;

create index feedback_items_theme_id_idx on public.feedback_items (theme_id);

alter table public.themes enable row level security;

create policy "Org members can view themes"
  on public.themes for select
  using (public.is_org_member(org_id));

-- Same role split as feedback_items: admins and members can create/update
-- (clustering itself runs as whichever user's action triggered it, or via
-- the service-role client for the anonymous widget path -- no separate
-- security-definer function needed here since, unlike org creation or
-- invite acceptance, there's no privilege boundary to cross), admins only
-- can delete (merging/removing a bad cluster is more consequential).
create policy "Admins and members can create themes"
  on public.themes for insert
  with check (public.has_org_role(org_id, array['admin', 'member']::public.org_role[]));

create policy "Admins and members can update themes"
  on public.themes for update
  using (public.has_org_role(org_id, array['admin', 'member']::public.org_role[]));

create policy "Admins can delete themes"
  on public.themes for delete
  using (public.has_org_role(org_id, array['admin']::public.org_role[]));

create trigger set_updated_at before update on public.themes
  for each row execute function public.set_updated_at();
