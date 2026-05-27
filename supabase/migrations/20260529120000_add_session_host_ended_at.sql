-- Track when a host manually ends a scheduled session so auto-sync won't reopen it.

alter table public.sessions
  add column if not exists host_ended_at timestamptz;

create index if not exists idx_sessions_schedule_slot_host_ended
  on public.sessions (schedule_slot_id, host_ended_at desc)
  where schedule_slot_id is not null;
