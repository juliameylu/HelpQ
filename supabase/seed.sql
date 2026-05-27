-- Seed data for local Supabase development.

with owner as (
  select id from public.profiles where role = 'professor' order by created_at asc limit 1
)
insert into public.classes (
  id,
  title,
  code,
  description,
  join_code,
  created_by
)
select
  '44444444-4444-4444-8444-444444444444'::uuid,
  'Introduction to Software Engineering',
  'CSC 307',
  'Introduction to software development methodologies and practices.',
  'CSC307',
  owner.id
from owner
on conflict (id) do update
set
  title = excluded.title,
  code = excluded.code,
  description = excluded.description,
  join_code = excluded.join_code,
  created_by = excluded.created_by,
  updated_at = current_timestamp;

with owner as (
  select id from public.profiles where role = 'professor' order by created_at asc limit 1
)
insert into public.classes (
  id,
  title,
  code,
  description,
  join_code,
  created_by
)
select
  '55555555-5555-4555-8555-555555555555'::uuid,
  'Data Structures',
  'CSC 203',
  'Fundamental data structures and algorithms.',
  'CSC203',
  owner.id
from owner
on conflict (id) do update
set
  title = excluded.title,
  code = excluded.code,
  description = excluded.description,
  join_code = excluded.join_code,
  created_by = excluded.created_by,
  updated_at = current_timestamp;

insert into public.class_enrollments (class_id, user_id)
select
  '44444444-4444-4444-8444-444444444444'::uuid,
  p.id
from public.profiles p
where p.role = 'professor'
on conflict (class_id, user_id) do nothing;

insert into public.sessions (
  id,
  host_id,
  class_id_uuid,
  join_code,
  title,
  description,
  status
)
values
  (
    '11111111-1111-4111-8111-111111111111',
    'host-prof-lin',
    '44444444-4444-4444-8444-444444444444'::uuid,
    'CS307',
    'CSC 307 Office Hours',
    'Help with React, Express, Supabase, and testing.',
    'active'
  ),
  (
    '22222222-2222-4222-8222-222222222222',
    'host-ta-sofia',
    '55555555-5555-4555-8555-555555555555'::uuid,
    'SEED101',
    'Debugging Lab',
    'Bring your error messages and reproduction steps.',
    'active'
  ),
  (
    '33333333-3333-4333-8333-333333333333',
    'host-prof-julia',
    '44444444-4444-4444-8444-444444444444'::uuid,
    'CLOSED1',
    'Past Office Hours',
    'Reference closed session for status testing.',
    'closed'
  )
on conflict (id) do update
set
  host_id = excluded.host_id,
  class_id_uuid = excluded.class_id_uuid,
  join_code = excluded.join_code,
  title = excluded.title,
  description = excluded.description,
  status = excluded.status,
  updated_at = current_timestamp;

insert into public.queue_entries (
  id,
  session_id,
  student_name,
  question,
  status
)
values
  (
    'aaaaaaa1-aaaa-4aaa-8aaa-aaaaaaaaaaa1',
    '11111111-1111-4111-8111-111111111111',
    'Maya C.',
    'Project setup keeps failing on npm install.',
    'in_progress'
  ),
  (
    'aaaaaaa2-aaaa-4aaa-8aaa-aaaaaaaaaaa2',
    '11111111-1111-4111-8111-111111111111',
    'Alex R.',
    'React state is not updating after submit.',
    'waiting'
  ),
  (
    'aaaaaaa3-aaaa-4aaa-8aaa-aaaaaaaaaaa3',
    '11111111-1111-4111-8111-111111111111',
    'Priya S.',
    'Need help testing an Express route.',
    'waiting'
  ),
  (
    'bbbbbbb1-bbbb-4bbb-8bbb-bbbbbbbbbbb1',
    '22222222-2222-4222-8222-222222222222',
    'Jordan T.',
    'My fetch call is returning 401.',
    'waiting'
  )
on conflict (id) do update
set
  session_id = excluded.session_id,
  student_name = excluded.student_name,
  question = excluded.question,
  status = excluded.status,
  updated_at = current_timestamp;
