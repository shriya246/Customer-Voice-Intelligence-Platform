-- Members-list UI needs to show email, and auth.users isn't queryable from
-- the client (only via the service-role/admin API) -- mirror it onto
-- profiles instead, same as full_name/avatar_url already are.
alter table public.profiles add column email text;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, avatar_url, email)
  values (
    new.id,
    new.raw_user_meta_data ->> 'full_name',
    new.raw_user_meta_data ->> 'avatar_url',
    new.email
  );
  return new;
end;
$$;
