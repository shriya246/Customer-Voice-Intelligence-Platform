-- Feature requests, optionally linked to the theme that motivated them (a
-- PM pushing a top-scored opportunity onto the roadmap) but not required to
-- be -- a standalone idea with no clustered feedback behind it yet is still
-- a valid roadmap item.
create table public.roadmap_items (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations (id) on delete cascade,
  theme_id uuid references public.themes (id) on delete set null,
  title text not null,
  description text,
  status text not null default 'under_review'
    check (status in ('under_review', 'planned', 'in_progress', 'shipped', 'declined')),
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index roadmap_items_org_id_idx on public.roadmap_items (org_id);
create index roadmap_items_theme_id_idx on public.roadmap_items (theme_id);

alter table public.roadmap_items enable row level security;

-- Same role split as feedback_items/themes: any member can view, admins and
-- members can create/edit, only admins delete.
create policy "Org members can view roadmap items"
  on public.roadmap_items for select
  using (public.is_org_member(org_id));

create policy "Admins and members can create roadmap items"
  on public.roadmap_items for insert
  with check (public.has_org_role(org_id, array['admin', 'member']::public.org_role[]));

create policy "Admins and members can update roadmap items"
  on public.roadmap_items for update
  using (public.has_org_role(org_id, array['admin', 'member']::public.org_role[]));

create policy "Admins can delete roadmap items"
  on public.roadmap_items for delete
  using (public.has_org_role(org_id, array['admin']::public.org_role[]));

create trigger set_updated_at before update on public.roadmap_items
  for each row execute function public.set_updated_at();
