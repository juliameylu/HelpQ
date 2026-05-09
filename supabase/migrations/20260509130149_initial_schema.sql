-- Initial HelpQ schema.
-- This migration creates the session and queue tables used by the Express backend.

create extension if not exists pgcrypto;

create table if not exists public.sessions (
  id uuid primary key default gen_random_uuid(),
  host_id text not null,
  join_code varchar(10) unique not null,
  title varchar(255) not null,
  description text,
  status varchar(50) default 'active',
  created_at timestamp default current_timestamp,
  updated_at timestamp default current_timestamp
);

create table if not exists public.queue_entries (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.sessions(id) on delete cascade,
  student_name varchar(255) not null,
  question text not null,
  status varchar(50) default 'waiting',
  position integer,
  created_at timestamp default current_timestamp,
  updated_at timestamp default current_timestamp
);

create index if not exists idx_sessions_host_id on public.sessions(host_id);
create index if not exists idx_sessions_join_code on public.sessions(join_code);
create index if not exists idx_queue_entries_session_id on public.queue_entries(session_id);
create index if not exists idx_queue_entries_status on public.queue_entries(status);

alter publication supabase_realtime add table public.sessions, public.queue_entries;
