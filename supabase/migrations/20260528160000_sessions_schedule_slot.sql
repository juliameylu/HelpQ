-- Link live sessions to recurring schedule slots (auto start/stop).

alter table public.sessions
  add column if not exists schedule_slot_id uuid;

alter table public.sessions
  drop constraint if exists sessions_schedule_slot_id_fkey;

alter table public.sessions
  add constraint sessions_schedule_slot_id_fkey
  foreign key (schedule_slot_id) references public.office_hours_schedule_slots(id)
  on delete set null;

alter table public.sessions
  add column if not exists schedule_occurrence_key text;

create unique index if not exists idx_sessions_schedule_occurrence_key
  on public.sessions(schedule_occurrence_key)
  where schedule_occurrence_key is not null;

create index if not exists idx_sessions_schedule_slot_id
  on public.sessions(schedule_slot_id);
