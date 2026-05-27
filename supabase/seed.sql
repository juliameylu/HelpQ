-- Seed data for local Supabase development.

insert into public.sessions (
  id,
  host_id,
  join_code,
  title,
  description,
  status
)
values
  (
    '11111111-1111-4111-8111-111111111111',
    'host-prof-lin',
    'CS307',
    'CSC 307 Office Hours',
    'Help with React, Express, Supabase, and testing.',
    'active'
  ),
  (
    '22222222-2222-4222-8222-222222222222',
    'host-ta-sofia',
    'SEED101',
    'Debugging Lab',
    'Bring your error messages and reproduction steps.',
    'active'
  ),
  (
    '33333333-3333-4333-8333-333333333333',
    'host-prof-julia',
    'CLOSED1',
    'Past Office Hours',
    'Reference closed session for status testing.',
    'closed'
  )
on conflict (id) do update
set
  host_id = excluded.host_id,
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
