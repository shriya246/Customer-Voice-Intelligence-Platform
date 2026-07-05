-- Extensions
create extension if not exists pgcrypto;

-- Enums
create type public.org_role as enum ('admin', 'member', 'viewer');
create type public.member_status as enum ('active', 'invited');
create type public.feedback_source as enum ('manual', 'csv_import', 'widget');

-- ============================================================================
-- Tables
-- ============================================================================

create table public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Mirrors auth.users for app-level profile data (auth.users itself isn't extensible).
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text,
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.org_members (
  org_id uuid not null references public.organizations (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  role public.org_role not null default 'member',
  status public.member_status not null default 'active',
  invited_email text,
  created_at timestamptz not null default now(),
  primary key (org_id, user_id)
);

create index org_members_user_id_idx on public.org_members (user_id);

-- Writes only ever happen from trusted server code using the service-role key
-- (which bypasses RLS) -- see is_org_member()/has_org_role() note below.
create table public.audit_log (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations (id) on delete cascade,
  actor_user_id uuid references public.profiles (id) on delete set null,
  action text not null,
  target_type text,
  target_id uuid,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index audit_log_org_id_idx on public.audit_log (org_id, created_at desc);

create table public.channels (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations (id) on delete cascade,
  name text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (org_id, name)
);

create table public.customers (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations (id) on delete cascade,
  name text,
  email text,
  company text,
  external_id text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index customers_org_email_idx
  on public.customers (org_id, lower(email))
  where email is not null;

create table public.tags (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations (id) on delete cascade,
  name text not null,
  created_at timestamptz not null default now(),
  unique (org_id, name)
);

create table public.feedback_items (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations (id) on delete cascade,
  channel_id uuid not null references public.channels (id) on delete restrict,
  customer_id uuid references public.customers (id) on delete set null,
  content text not null,
  source public.feedback_source not null default 'manual',
  created_by uuid references public.profiles (id) on delete set null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index feedback_items_org_id_idx on public.feedback_items (org_id, created_at desc);
create index feedback_items_channel_id_idx on public.feedback_items (channel_id);
create index feedback_items_customer_id_idx on public.feedback_items (customer_id);

create table public.feedback_item_tags (
  feedback_item_id uuid not null references public.feedback_items (id) on delete cascade,
  tag_id uuid not null references public.tags (id) on delete cascade,
  primary key (feedback_item_id, tag_id)
);

create index feedback_item_tags_tag_id_idx on public.feedback_item_tags (tag_id);

-- ============================================================================
-- Helper functions
--
-- security definer + a pinned search_path so these bypass RLS on org_members
-- internally (avoiding recursive-policy issues) without being hijackable via
-- search_path tricks. This is the standard Supabase pattern for RBAC checks
-- used inside other tables' policies.
-- ============================================================================

create or replace function public.is_org_member(p_org_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.org_members
    where org_id = p_org_id and user_id = auth.uid() and status = 'active'
  );
$$;

create or replace function public.has_org_role(p_org_id uuid, p_roles public.org_role[])
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.org_members
    where org_id = p_org_id
      and user_id = auth.uid()
      and status = 'active'
      and role = any(p_roles)
  );
$$;

create or replace function public.shares_org_with(p_user_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1
    from public.org_members mine
    join public.org_members theirs on theirs.org_id = mine.org_id
    where mine.user_id = auth.uid() and theirs.user_id = p_user_id
  );
$$;

grant execute on function public.is_org_member(uuid) to authenticated;
grant execute on function public.has_org_role(uuid, public.org_role[]) to authenticated;
grant execute on function public.shares_org_with(uuid) to authenticated;

-- Creates an organization and atomically makes the caller its admin. This is
-- the only supported way to create an organization -- there is deliberately
-- no direct insert policy on organizations, so skipping this RPC can't leave
-- an org with no admin member.
create or replace function public.create_organization(p_name text, p_slug text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_org_id uuid;
begin
  if auth.uid() is null then
    raise exception 'Must be authenticated to create an organization';
  end if;

  insert into public.organizations (name, slug)
  values (p_name, p_slug)
  returning id into v_org_id;

  insert into public.org_members (org_id, user_id, role, status)
  values (v_org_id, auth.uid(), 'admin', 'active');

  return v_org_id;
end;
$$;

grant execute on function public.create_organization(text, text) to authenticated;

-- New auth.users row -> matching public.profiles row.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, avatar_url)
  values (
    new.id,
    new.raw_user_meta_data ->> 'full_name',
    new.raw_user_meta_data ->> 'avatar_url'
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger set_updated_at before update on public.organizations
  for each row execute function public.set_updated_at();
create trigger set_updated_at before update on public.profiles
  for each row execute function public.set_updated_at();
create trigger set_updated_at before update on public.channels
  for each row execute function public.set_updated_at();
create trigger set_updated_at before update on public.customers
  for each row execute function public.set_updated_at();
create trigger set_updated_at before update on public.feedback_items
  for each row execute function public.set_updated_at();

-- ============================================================================
-- Row-Level Security
-- ============================================================================

alter table public.organizations enable row level security;
alter table public.profiles enable row level security;
alter table public.org_members enable row level security;
alter table public.audit_log enable row level security;
alter table public.channels enable row level security;
alter table public.customers enable row level security;
alter table public.tags enable row level security;
alter table public.feedback_items enable row level security;
alter table public.feedback_item_tags enable row level security;

-- organizations: no insert policy on purpose -- see create_organization().
create policy "Members can view their organization"
  on public.organizations for select
  using (public.is_org_member(id));

create policy "Admins can update their organization"
  on public.organizations for update
  using (public.has_org_role(id, array['admin']::public.org_role[]));

-- profiles
create policy "Org-mates can view each other's profile"
  on public.profiles for select
  using (id = auth.uid() or public.shares_org_with(id));

create policy "Users can update their own profile"
  on public.profiles for update
  using (id = auth.uid());

-- org_members
create policy "Org members can view fellow members"
  on public.org_members for select
  using (public.is_org_member(org_id));

create policy "Admins can add members"
  on public.org_members for insert
  with check (public.has_org_role(org_id, array['admin']::public.org_role[]));

create policy "Admins can update member roles"
  on public.org_members for update
  using (public.has_org_role(org_id, array['admin']::public.org_role[]));

create policy "Admins can remove members, members can leave"
  on public.org_members for delete
  using (
    public.has_org_role(org_id, array['admin']::public.org_role[])
    or user_id = auth.uid()
  );

-- audit_log: read-only from the client; every write goes through the
-- service-role key from trusted server code, which bypasses RLS.
create policy "Admins can view their organization's audit log"
  on public.audit_log for select
  using (public.has_org_role(org_id, array['admin']::public.org_role[]));

-- channels
create policy "Org members can view channels"
  on public.channels for select
  using (public.is_org_member(org_id));

create policy "Admins and members can create channels"
  on public.channels for insert
  with check (public.has_org_role(org_id, array['admin', 'member']::public.org_role[]));

create policy "Admins and members can update channels"
  on public.channels for update
  using (public.has_org_role(org_id, array['admin', 'member']::public.org_role[]));

create policy "Admins can delete channels"
  on public.channels for delete
  using (public.has_org_role(org_id, array['admin']::public.org_role[]));

-- customers
create policy "Org members can view customers"
  on public.customers for select
  using (public.is_org_member(org_id));

create policy "Admins and members can create customers"
  on public.customers for insert
  with check (public.has_org_role(org_id, array['admin', 'member']::public.org_role[]));

create policy "Admins and members can update customers"
  on public.customers for update
  using (public.has_org_role(org_id, array['admin', 'member']::public.org_role[]));

create policy "Admins can delete customers"
  on public.customers for delete
  using (public.has_org_role(org_id, array['admin']::public.org_role[]));

-- tags
create policy "Org members can view tags"
  on public.tags for select
  using (public.is_org_member(org_id));

create policy "Admins and members can create tags"
  on public.tags for insert
  with check (public.has_org_role(org_id, array['admin', 'member']::public.org_role[]));

create policy "Admins can delete tags"
  on public.tags for delete
  using (public.has_org_role(org_id, array['admin']::public.org_role[]));

-- feedback_items
create policy "Org members can view feedback"
  on public.feedback_items for select
  using (public.is_org_member(org_id));

create policy "Admins and members can log feedback"
  on public.feedback_items for insert
  with check (public.has_org_role(org_id, array['admin', 'member']::public.org_role[]));

create policy "Admins and members can update feedback"
  on public.feedback_items for update
  using (public.has_org_role(org_id, array['admin', 'member']::public.org_role[]));

create policy "Admins can delete feedback"
  on public.feedback_items for delete
  using (public.has_org_role(org_id, array['admin']::public.org_role[]));

-- feedback_item_tags (scoped via the parent feedback item's org)
create policy "Org members can view feedback tag links"
  on public.feedback_item_tags for select
  using (
    exists (
      select 1 from public.feedback_items fi
      where fi.id = feedback_item_id and public.is_org_member(fi.org_id)
    )
  );

create policy "Admins and members can tag feedback"
  on public.feedback_item_tags for insert
  with check (
    exists (
      select 1 from public.feedback_items fi
      where fi.id = feedback_item_id
        and public.has_org_role(fi.org_id, array['admin', 'member']::public.org_role[])
    )
  );

create policy "Admins and members can untag feedback"
  on public.feedback_item_tags for delete
  using (
    exists (
      select 1 from public.feedback_items fi
      where fi.id = feedback_item_id
        and public.has_org_role(fi.org_id, array['admin', 'member']::public.org_role[])
    )
  );
