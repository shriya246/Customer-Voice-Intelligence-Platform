-- RLS audit finding: two join-table INSERT policies checked role membership
-- on one side of the link but never verified the *other* foreign key actually
-- belongs to that same org. The app's own code paths never construct a
-- cross-org pair, but RLS -- not app code -- is the real boundary against a
-- member calling PostgREST directly with a foreign org's UUID.

-- feedback_item_tags: verified fi.org_id for role, never verified tag_id
-- belongs to that org -- a member could link a foreign org's tag_id to their
-- own org's feedback item.
drop policy "Admins and members can tag feedback" on public.feedback_item_tags;

create policy "Admins and members can tag feedback"
  on public.feedback_item_tags for insert
  with check (
    exists (
      select 1 from public.feedback_items fi
      join public.tags t on t.org_id = fi.org_id
      where fi.id = feedback_item_id
        and t.id = tag_id
        and public.has_org_role(fi.org_id, array['admin', 'member']::public.org_role[])
    )
  );

-- persona_themes: same gap -- verified p.org_id for role, never verified
-- theme_id belongs to that org.
drop policy "Admins and members can link persona themes" on public.persona_themes;

create policy "Admins and members can link persona themes"
  on public.persona_themes for insert
  with check (
    exists (
      select 1 from public.personas p
      join public.themes th on th.org_id = p.org_id
      where p.id = persona_id
        and th.id = theme_id
        and public.has_org_role(p.org_id, array['admin', 'member']::public.org_role[])
    )
  );
