-- One recurring schedule per instructor per class.
create unique index if not exists idx_office_hours_schedules_class_host
  on public.office_hours_schedules (class_id, host_id);
