alter table public.sessions
  add column if not exists class_id text;

create index if not exists idx_sessions_class_id on public.sessions(class_id);
