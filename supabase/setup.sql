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

-- Photo storage (Part 5). Public so <img> tags can load photos directly; file
-- names are random UUIDs, so nothing links a photo to the person who sent it.
-- The bucket enforces its own size and type limits as a second line of defence
-- behind the server's checks. Only the server key can upload.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('issue-photos', 'issue-photos', true, 2000000,
        array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;
