-- Recurring weekly office hours (per class, multiple day/time slots).

create table if not exists public.office_hours_schedules (
  id uuid primary key default gen_random_uuid(),
  class_id uuid not null references public.classes(id) on delete cascade,
  host_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  description text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_office_hours_schedules_class_id
  on public.office_hours_schedules(class_id);

create table if not exists public.office_hours_schedule_slots (
  id uuid primary key default gen_random_uuid(),
  schedule_id uuid not null references public.office_hours_schedules(id) on delete cascade,
  day_of_week smallint not null check (day_of_week >= 0 and day_of_week <= 6),
  start_time time not null,
  end_time time not null,
  check (end_time > start_time)
);

create index if not exists idx_office_hours_schedule_slots_schedule_id
  on public.office_hours_schedule_slots(schedule_id);
