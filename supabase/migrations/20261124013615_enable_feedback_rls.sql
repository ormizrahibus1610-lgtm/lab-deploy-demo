-- Versioned migration: owner-scoped RLS on public.feedback_items
alter table public.feedback_items enable row level security;

drop policy if exists "feedback_select_own" on public.feedback_items;
create policy "feedback_select_own" on public.feedback_items
  for select to authenticated using ((select auth.uid()) = user_id);

drop policy if exists "feedback_insert_own" on public.feedback_items;
create policy "feedback_insert_own" on public.feedback_items
  for insert to authenticated with check ((select auth.uid()) = user_id);

drop policy if exists "feedback_update_own" on public.feedback_items;
create policy "feedback_update_own" on public.feedback_items
  for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists "feedback_delete_own" on public.feedback_items;
create policy "feedback_delete_own" on public.feedback_items
  for delete to authenticated using ((select auth.uid()) = user_id);
