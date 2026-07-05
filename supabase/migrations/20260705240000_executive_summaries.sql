-- Each generation is a new row, not an overwritten single "current summary"
-- -- an executive comparing this month's narrative to last month's is a
-- real use case (KPI_FRAMEWORK.md's "executive summary views per month"
-- metric implies exactly this history should exist, not just a live
-- snapshot that erases its own past).
create table public.executive_summaries (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations (id) on delete cascade,
  content text not null,
  generated_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now()
);

create index executive_summaries_org_id_idx on public.executive_summaries (org_id, created_at desc);

alter table public.executive_summaries enable row level security;

create policy "Org members can view executive summaries"
  on public.executive_summaries for select
  using (public.is_org_member(org_id));

create policy "Admins and members can generate executive summaries"
  on public.executive_summaries for insert
  with check (public.has_org_role(org_id, array['admin', 'member']::public.org_role[]));
