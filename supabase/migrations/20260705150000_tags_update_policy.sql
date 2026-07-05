-- Missing from the core schema migration: find-or-create-by-name via
-- upsert(onConflict: "org_id,name") issues an UPDATE on conflict at the SQL
-- level (even though the value doesn't actually change), which needs an
-- UPDATE policy to succeed under RLS. channels already had one; tags didn't
-- -- caught by the manual-feedback-entry verification script, which upserts
-- tags the same way it upserts channels.
create policy "Admins and members can update tags"
  on public.tags for update
  using (public.has_org_role(org_id, array['admin', 'member']::public.org_role[]));
