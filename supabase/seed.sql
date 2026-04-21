-- ─── Scrum Discipline Analytics — Seed Data ──────────────────────────────────
-- Run AFTER 001_schema.sql.
-- Uses fixed UUIDs so foreign keys resolve correctly.

-- ── Projects ──────────────────────────────────────────────────────────────────
insert into projects (id, name, description, scrum_time, scrum_timezone, status, late_grace_minutes) values
  ('11111111-0000-0000-0000-000000000001', 'Project Alpha', 'Frontend Team', '10:15', 'Asia/Kolkata', 'active',   5),
  ('11111111-0000-0000-0000-000000000002', 'Project Beta',  'Backend Team',  '10:15', 'Asia/Kolkata', 'active',   5),
  ('11111111-0000-0000-0000-000000000003', 'Project Gamma', 'QA Team',       '10:15', 'Asia/Kolkata', 'active',   0),
  ('11111111-0000-0000-0000-000000000004', 'Project Delta', 'DevOps Team',   '10:30', 'Asia/Kolkata', 'archived', 0)
on conflict (id) do nothing;

-- ── Attendees ─────────────────────────────────────────────────────────────────
insert into attendees (id, name, email, employee_id, role, project, manager, status) values
  ('22222222-0000-0000-0000-000000000001', 'Sarah Johnson',    'sarah.j@company.com',    'EMP-2847', 'dev', 'Project Alpha', 'Michael Chen',  'active'  ),
  ('22222222-0000-0000-0000-000000000002', 'Michael Chen',     'michael.c@company.com',  'EMP-2651', 'dev', 'Project Beta',  '',              'active'  ),
  ('22222222-0000-0000-0000-000000000003', 'Emily Rodriguez',  'emily.r@company.com',    'EMP-3092', 'qa',  'Project Alpha', 'Robert Taylor', 'active'  ),
  ('22222222-0000-0000-0000-000000000004', 'David Kumar',      'david.k@company.com',    'EMP-2413', 'dev', 'Project Gamma', 'Sarah Johnson', 'active'  ),
  ('22222222-0000-0000-0000-000000000005', 'Jessica Williams', 'jessica.w@company.com',  'EMP-2789', 'ba',  'Project Beta',  '',              'on_leave'),
  ('22222222-0000-0000-0000-000000000006', 'Robert Taylor',    'robert.t@company.com',   'EMP-3156', 'dev', 'Project Alpha', '',              'active'  ),
  ('22222222-0000-0000-0000-000000000007', 'Amanda Lee',       'amanda.l@company.com',   'EMP-2934', 'qa',  'Project Gamma', 'Lisa Anderson', 'active'  ),
  ('22222222-0000-0000-0000-000000000008', 'James Wilson',     'james.w@company.com',    'EMP-2201', 'ba',  'Project Beta',  'Karen Davis',   'active'  ),
  ('22222222-0000-0000-0000-000000000009', 'Karen Davis',      'karen.d@company.com',    'EMP-1934', 'ba',  'Project Alpha', '',              'active'  ),
  ('22222222-0000-0000-0000-000000000010', 'Lisa Anderson',    'lisa.a@company.com',     'EMP-2105', 'qa',  'Project Gamma', '',              'active'  )
on conflict (id) do nothing;

-- ── Holidays ──────────────────────────────────────────────────────────────────
insert into holidays (id, project_id, holiday_date, name) values
  ('33333333-0000-0000-0000-000000000001', '11111111-0000-0000-0000-000000000001', '2026-04-14', 'Dr. Ambedkar Jayanti'),
  ('33333333-0000-0000-0000-000000000002', '11111111-0000-0000-0000-000000000002', '2026-04-14', 'Dr. Ambedkar Jayanti'),
  ('33333333-0000-0000-0000-000000000003', '11111111-0000-0000-0000-000000000003', '2026-04-14', 'Dr. Ambedkar Jayanti'),
  ('33333333-0000-0000-0000-000000000004', '11111111-0000-0000-0000-000000000001', '2026-04-21', 'Ram Navami'),
  ('33333333-0000-0000-0000-000000000005', '11111111-0000-0000-0000-000000000002', '2026-04-21', 'Ram Navami')
on conflict (id) do nothing;

-- ── Leaves ────────────────────────────────────────────────────────────────────
insert into leaves (id, project_id, attendee_id, start_date, end_date, reason, approved_by) values
  ('44444444-0000-0000-0000-000000000001', '11111111-0000-0000-0000-000000000001', '22222222-0000-0000-0000-000000000001', '2026-04-20', '2026-04-22', 'Personal',      'Admin User'),
  ('44444444-0000-0000-0000-000000000002', '11111111-0000-0000-0000-000000000002', '22222222-0000-0000-0000-000000000005', '2026-04-15', '2026-04-25', 'Medical Leave', 'Admin User')
on conflict (id) do nothing;

-- ── Project Memberships ───────────────────────────────────────────────────────
insert into project_memberships (id, project_id, user_name, user_email, role) values
  ('55555555-0000-0000-0000-000000000001', '11111111-0000-0000-0000-000000000001', 'Admin User', 'admin@company.com', 'owner_pmo'),
  ('55555555-0000-0000-0000-000000000002', '11111111-0000-0000-0000-000000000002', 'Admin User', 'admin@company.com', 'owner_pmo'),
  ('55555555-0000-0000-0000-000000000003', '11111111-0000-0000-0000-000000000003', 'Admin User', 'admin@company.com', 'owner_pmo')
on conflict (id) do nothing;

-- NOTE: attendance_entries are not seeded here because dates would be stale.
-- Use the app's "Mark Attendance" feature or the Supabase dashboard to add live records.
