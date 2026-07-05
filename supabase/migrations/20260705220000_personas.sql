-- AI-generated, data-backed personas: synthesized from real clustered
-- feedback themes, not hypothetical user-research personas (contrast with
-- PERSONAS.md, which describes VoiceIQ's own target users -- these
-- personas describe a VoiceIQ customer's *own* end customers).
create table public.personas (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations (id) on delete cascade,
  name text not null,
  description text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Which themes a persona was actually synthesized from -- the traceability
-- chain (feedback -> theme -> score -> roadmap) extends here too: a persona
-- always points back to the real clustered data that produced it.
create table public.persona_themes (
  persona_id uuid not null references public.personas (id) on delete cascade,
  theme_id uuid not null references public.themes (id) on delete cascade,
  primary key (persona_id, theme_id)
);

create index personas_org_id_idx on public.personas (org_id);

alter table public.personas enable row level security;
alter table public.persona_themes enable row level security;

create policy "Org members can view personas"
  on public.personas for select
  using (public.is_org_member(org_id));

create policy "Admins and members can create personas"
  on public.personas for insert
  with check (public.has_org_role(org_id, array['admin', 'member']::public.org_role[]));

create policy "Admins and members can delete personas"
  on public.personas for delete
  using (public.has_org_role(org_id, array['admin', 'member']::public.org_role[]));

create policy "Org members can view persona-theme links"
  on public.persona_themes for select
  using (
    exists (
      select 1 from public.personas p
      where p.id = persona_id and public.is_org_member(p.org_id)
    )
  );

create policy "Admins and members can link persona themes"
  on public.persona_themes for insert
  with check (
    exists (
      select 1 from public.personas p
      where p.id = persona_id
        and public.has_org_role(p.org_id, array['admin', 'member']::public.org_role[])
    )
  );

create trigger set_updated_at before update on public.personas
  for each row execute function public.set_updated_at();
