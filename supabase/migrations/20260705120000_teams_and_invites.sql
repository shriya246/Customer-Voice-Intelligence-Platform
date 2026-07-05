-- Multi-org support: track which org is "active" for a user who belongs to
-- more than one (the org switcher). Nullable -- falls back to first
-- membership found when unset (e.g. a removed/stale reference).
alter table public.profiles
  add column current_org_id uuid references public.organizations (id) on delete set null;

-- Email-based invitations. Deliberately a separate table from org_members:
-- org_members.user_id is not null (it always represents a real member), so
-- an invite to someone who hasn't signed up yet can't be represented as an
-- org_members row at all. This table exists independently until accepted.
create table public.invites (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations (id) on delete cascade,
  email text not null,
  role public.org_role not null default 'member',
  token uuid not null default gen_random_uuid() unique,
  status text not null default 'pending' check (status in ('pending', 'accepted', 'revoked')),
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  accepted_at timestamptz
);

create index invites_org_id_idx on public.invites (org_id);

alter table public.invites enable row level security;

-- No public select policy: an unauthenticated visitor with a token needs to
-- see the invite's org/role/status before they've signed up or joined,
-- which is exactly what these RLS policies don't allow. That lookup (and
-- acceptance) goes through the two security-definer functions below instead.
create policy "Admins can view their organization's invites"
  on public.invites for select
  using (public.has_org_role(org_id, array['admin']::public.org_role[]));

create policy "Admins can create invites"
  on public.invites for insert
  with check (public.has_org_role(org_id, array['admin']::public.org_role[]));

create policy "Admins can revoke invites"
  on public.invites for update
  using (public.has_org_role(org_id, array['admin']::public.org_role[]));

create or replace function public.get_invite_by_token(p_token uuid)
returns table (org_name text, role public.org_role, email text, status text)
language sql
security definer
set search_path = public
stable
as $$
  select o.name, i.role, i.email, i.status
  from public.invites i
  join public.organizations o on o.id = i.org_id
  where i.token = p_token;
$$;

grant execute on function public.get_invite_by_token(uuid) to authenticated, anon;

-- Requires the accepting user's auth email to match the invite (defense in
-- depth against a leaked link being used by the wrong person -- strongest
-- when email confirmation is enabled on the project, still a reasonable
-- extra check when it isn't).
create or replace function public.accept_invite(p_token uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_invite public.invites%rowtype;
  v_email text;
begin
  if auth.uid() is null then
    raise exception 'Must be authenticated to accept an invite';
  end if;

  select * into v_invite from public.invites where token = p_token for update;

  if not found then
    raise exception 'Invite not found';
  end if;

  if v_invite.status <> 'pending' then
    raise exception 'This invite has already been %', v_invite.status;
  end if;

  select email into v_email from auth.users where id = auth.uid();
  if lower(v_email) <> lower(v_invite.email) then
    raise exception 'This invite was sent to a different email address';
  end if;

  insert into public.org_members (org_id, user_id, role, status)
  values (v_invite.org_id, auth.uid(), v_invite.role, 'active')
  on conflict (org_id, user_id) do update set role = excluded.role, status = 'active';

  update public.invites set status = 'accepted', accepted_at = now() where id = v_invite.id;
  update public.profiles set current_org_id = v_invite.org_id where id = auth.uid();

  return v_invite.org_id;
end;
$$;

grant execute on function public.accept_invite(uuid) to authenticated;

-- create_organization now also makes the new org the caller's active one.
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

  update public.profiles set current_org_id = v_org_id where id = auth.uid();

  return v_org_id;
end;
$$;

-- Closes the known gap from the core schema migration: nothing previously
-- stopped removing or demoting an org's last remaining admin, which would
-- leave it unmanageable.
create or replace function public.prevent_last_admin_removal()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_remaining_admins int;
begin
  if old.role = 'admin' and old.status = 'active'
     and (tg_op = 'DELETE' or new.role <> 'admin' or new.status <> 'active') then
    select count(*) into v_remaining_admins
    from public.org_members
    where org_id = old.org_id
      and role = 'admin'
      and status = 'active'
      and user_id <> old.user_id;

    if v_remaining_admins = 0 then
      raise exception 'Cannot remove the last admin of an organization';
    end if;
  end if;

  if tg_op = 'DELETE' then
    return old;
  end if;
  return new;
end;
$$;

create trigger prevent_last_admin_removal
  before update or delete on public.org_members
  for each row execute function public.prevent_last_admin_removal();
