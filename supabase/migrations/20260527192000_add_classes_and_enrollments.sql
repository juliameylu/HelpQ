-- Persistent classes + enrollments.

create extension if not exists pgcrypto;

create table if not exists public.classes (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  code text not null,
  description text,
  join_code text not null unique,
  created_by uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_classes_created_by on public.classes(created_by);

create table if not exists public.class_enrollments (
  class_id uuid not null references public.classes(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (class_id, user_id)
);

create index if not exists idx_class_enrollments_user_id on public.class_enrollments(user_id);

-- Sessions: migrate from legacy text class_id to uuid foreign key.
-- We keep the old column for compatibility and add a new FK-backed column.
alter table public.sessions
  add column if not exists class_id_uuid uuid;

alter table public.sessions
  drop constraint if exists sessions_class_id_uuid_fkey;

alter table public.sessions
  add constraint sessions_class_id_uuid_fkey
  foreign key (class_id_uuid) references public.classes(id) on delete set null;

create index if not exists idx_sessions_class_id_uuid on public.sessions(class_id_uuid);

