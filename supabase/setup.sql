-- CityTrace runtime state.
-- Run once in the Supabase SQL Editor of each project (dev and prod).

create table if not exists app_state (
  key        text primary key,
  data       jsonb not null default '{}'::jsonb,
  version    integer not null default 0,
  updated_at timestamptz not null default now()
);

-- No policies on purpose: only the server-side service role key can read or write.
alter table app_state enable row level security;

insert into app_state (key) values ('issues'), ('governance')
on conflict (key) do nothing;
