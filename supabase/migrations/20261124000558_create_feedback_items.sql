-- Versioned migration: public.feedback_items (RLS lockdown follows next)
create table if not exists public.feedback_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null check (char_length(trim(title)) between 3 and 120),
  votes integer not null default 0 check (votes >= 0),
  created_at timestamptz not null default now()
);

create index if not exists feedback_items_user_id_idx
  on public.feedback_items (user_id);
