-- Manual competitive insight notes, with an optional AI-assisted summary of
-- what customers actually say about that competitor in their feedback
-- (ai_summary is generated from a search over feedback_items, not written
-- by the PM -- kept in a separate column so it's visibly distinct from the
-- PM's own note, never silently overwriting what they wrote).
create table public.competitive_notes (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations (id) on delete cascade,
  competitor_name text not null,
  note text not null,
  ai_summary text,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index competitive_notes_org_id_idx on public.competitive_notes (org_id);

alter table public.competitive_notes enable row level security;

create policy "Org members can view competitive notes"
  on public.competitive_notes for select
  using (public.is_org_member(org_id));

create policy "Admins and members can create competitive notes"
  on public.competitive_notes for insert
  with check (public.has_org_role(org_id, array['admin', 'member']::public.org_role[]));

create policy "Admins and members can update competitive notes"
  on public.competitive_notes for update
  using (public.has_org_role(org_id, array['admin', 'member']::public.org_role[]));

create policy "Admins can delete competitive notes"
  on public.competitive_notes for delete
  using (public.has_org_role(org_id, array['admin']::public.org_role[]));

create trigger set_updated_at before update on public.competitive_notes
  for each row execute function public.set_updated_at();
