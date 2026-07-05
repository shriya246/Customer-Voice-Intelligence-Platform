-- Callable from ordinary authenticated Server Actions to log an event for
-- an org they're actually a member of. actor_user_id always comes from
-- auth.uid() (never a client-supplied parameter), so it can't be spoofed --
-- the audit trail's job is to say who really did something, not whatever a
-- caller claims.
create or replace function public.log_audit_event(
  p_org_id uuid,
  p_action text,
  p_target_type text default null,
  p_target_id uuid default null,
  p_metadata jsonb default '{}'::jsonb
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_org_member(p_org_id) then
    raise exception 'Must be a member of the organization to log an event for it';
  end if;

  insert into public.audit_log (org_id, actor_user_id, action, target_type, target_id, metadata)
  values (p_org_id, auth.uid(), p_action, p_target_type, p_target_id, p_metadata);
end;
$$;

grant execute on function public.log_audit_event(uuid, text, text, uuid, jsonb) to authenticated;

-- create_organization and accept_invite are already security definer and
-- run in the same transaction as the action itself, so they insert directly
-- rather than round-tripping through log_audit_event.

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

  insert into public.audit_log (org_id, actor_user_id, action, target_type, target_id)
  values (v_org_id, auth.uid(), 'organization.created', 'organization', v_org_id);

  return v_org_id;
end;
$$;

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

  insert into public.audit_log (org_id, actor_user_id, action, target_type, target_id, metadata)
  values (v_invite.org_id, auth.uid(), 'invite.accepted', 'invite', v_invite.id, jsonb_build_object('role', v_invite.role));

  return v_invite.org_id;
end;
$$;
