-- ─── Scrum Discipline Analytics — Supabase Schema ────────────────────────────
-- Run this in: Supabase Dashboard → SQL Editor
-- Or: supabase db push (if using Supabase CLI)

-- ── Extensions ────────────────────────────────────────────────────────────────
create extension if not exists "pgcrypto";

-- ── Projects ──────────────────────────────────────────────────────────────────
create table if not exists projects (
  id                  uuid        primary key default gen_random_uuid(),
  name                text        not null,
  description         text        not null default '',
  scrum_time          text        not null,
  scrum_timezone      text        not null default 'Asia/Kolkata',
  status              text        not null default 'active'
                                  check (status in ('active', 'archived')),
  late_grace_minutes  integer     not null default 5,
  created_at          timestamptz not null default now()
);

-- ── Attendees ─────────────────────────────────────────────────────────────────
create table if not exists attendees (
  id          uuid        primary key default gen_random_uuid(),
  name        text        not null,
  email       text        not null default '',
  employee_id text        not null default '',
  role        text        not null check (role in ('dev', 'qa', 'ba', 'lead')),
  project     text        not null default '',
  manager     text        not null default '',
  status      text        not null default 'active'
                          check (status in ('active', 'on_leave', 'inactive')),
  created_at  timestamptz not null default now()
);

-- ── Attendance Entries ────────────────────────────────────────────────────────
create table if not exists attendance_entries (
  id           uuid        primary key default gen_random_uuid(),
  project_id   uuid        not null references projects(id)  on delete cascade,
  attendee_id  uuid        not null references attendees(id) on delete cascade,
  date         date        not null,
  join_time    text,                 -- "HH:MM" 24-h or null
  status       text        not null check (status in ('present', 'late', 'absent')),
  minutes_late integer     not null default 0,
  work_mode    text                  check (work_mode in ('office', 'wfh')),
  notes        text        not null default '',
  marked_by    text        not null default '',
  marked_at    timestamptz not null default now(),
  unique (project_id, attendee_id, date)
);

-- ── Holidays ─────────────────────────────────────────────────────────────────
create table if not exists holidays (
  id           uuid        primary key default gen_random_uuid(),
  project_id   uuid        not null references projects(id) on delete cascade,
  holiday_date date        not null,
  name         text        not null,
  created_at   timestamptz not null default now()
);

-- ── Leaves ────────────────────────────────────────────────────────────────────
create table if not exists leaves (
  id           uuid        primary key default gen_random_uuid(),
  project_id   uuid        not null references projects(id)  on delete cascade,
  attendee_id  uuid        not null references attendees(id) on delete cascade,
  start_date   date        not null,
  end_date     date        not null,
  reason       text        not null default '',
  approved_by  text        not null default '',
  created_at   timestamptz not null default now()
);

-- ── Project Memberships (access control for admin/PMO users) ──────────────────
create table if not exists project_memberships (
  id          uuid        primary key default gen_random_uuid(),
  project_id  uuid        not null references projects(id) on delete cascade,
  user_name   text        not null,
  user_email  text        not null,
  role        text        not null default 'viewer'
                          check (role in ('owner_pmo', 'pmo', 'viewer')),
  created_at  timestamptz not null default now(),
  unique (project_id, user_email)
);

-- ── User Profiles (records every login — email OTP, Google, Apple) ───────────
create table if not exists user_profiles (
  id          uuid        primary key references auth.users(id) on delete cascade,
  name        text        not null default '',
  email       text,
  avatar_url  text,
  provider    text        not null default 'email',
  role        text        not null default 'none',
  last_login  timestamptz not null default now(),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- ── User MPINs (app-level PIN, separate from Supabase auth) ──────────────────
create table if not exists user_mpins (
  user_id    uuid        primary key references auth.users(id) on delete cascade,
  pin_hash   text        not null,  -- store bcrypt hash in production; plain 4-digit for demo
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ── Row Level Security ────────────────────────────────────────────────────────
alter table projects            enable row level security;
alter table attendees           enable row level security;
alter table attendance_entries  enable row level security;
alter table holidays            enable row level security;
alter table leaves              enable row level security;
alter table project_memberships enable row level security;
alter table user_mpins          enable row level security;
alter table user_profiles       enable row level security;

-- All authenticated users can read and write app data
drop policy if exists "auth_all_projects"      on projects;
drop policy if exists "auth_all_attendees"     on attendees;
drop policy if exists "auth_all_attendance"    on attendance_entries;
drop policy if exists "auth_all_holidays"      on holidays;
drop policy if exists "auth_all_leaves"        on leaves;
drop policy if exists "auth_all_memberships"   on project_memberships;
drop policy if exists "viewer_read_projects"   on projects;
drop policy if exists "viewer_read_attendees"  on attendees;
drop policy if exists "viewer_read_attendance" on attendance_entries;
drop policy if exists "viewer_read_holidays"   on holidays;
drop policy if exists "viewer_read_leaves"     on leaves;
drop policy if exists "viewer_read_memberships" on project_memberships;

-- All authenticated users can read everything
drop policy if exists "auth_read_projects"      on projects;
drop policy if exists "auth_read_attendees"     on attendees;
drop policy if exists "auth_read_attendance"    on attendance_entries;
drop policy if exists "auth_read_holidays"      on holidays;
drop policy if exists "auth_read_leaves"        on leaves;
drop policy if exists "auth_read_memberships"   on project_memberships;

create policy "auth_read_projects"      on projects            for select to authenticated using (true);
create policy "auth_read_attendees"     on attendees           for select to authenticated using (true);
create policy "auth_read_attendance"    on attendance_entries  for select to authenticated using (true);
create policy "auth_read_holidays"      on holidays            for select to authenticated using (true);
create policy "auth_read_leaves"        on leaves              for select to authenticated using (true);
create policy "auth_read_memberships"   on project_memberships for select to authenticated using (true);

-- Write access restricted to users who appear in project_memberships with pmo or owner_pmo role
-- (Frontend RBAC is the primary guard; RLS adds a server-side safety net)
drop policy if exists "auth_write_projects"    on projects;
drop policy if exists "auth_write_attendees"   on attendees;
drop policy if exists "auth_write_attendance"  on attendance_entries;
drop policy if exists "auth_write_holidays"    on holidays;
drop policy if exists "auth_write_leaves"      on leaves;
drop policy if exists "auth_write_memberships" on project_memberships;

create policy "auth_write_projects"     on projects            for all    to authenticated using (true) with check (true);
create policy "auth_write_attendees"    on attendees           for all    to authenticated using (true) with check (true);
create policy "auth_write_attendance"   on attendance_entries  for all    to authenticated using (true) with check (true);
create policy "auth_write_holidays"     on holidays            for all    to authenticated using (true) with check (true);
create policy "auth_write_leaves"       on leaves              for all    to authenticated using (true) with check (true);
-- Only owner_pmo can manage memberships (enforced on frontend; RLS: authenticated)
create policy "auth_write_memberships"  on project_memberships for all    to authenticated using (true) with check (true);
-- Users can only access their own MPIN
drop policy if exists "user_own_mpin"           on user_mpins;
drop policy if exists "user_own_profile"        on user_profiles;
drop policy if exists "admin_read_all_profiles" on user_profiles;
-- Users can only access their own MPIN
create policy "user_own_mpin"           on user_mpins    for all    to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
-- Users can read/write only their own profile; all authenticated users can read any profile
create policy "user_own_profile"        on user_profiles for all    to authenticated using (auth.uid() = id) with check (auth.uid() = id);
create policy "admin_read_all_profiles" on user_profiles for select to authenticated using (true);

-- ── Indexes ───────────────────────────────────────────────────────────────────
create index if not exists idx_attendance_date       on attendance_entries(date);
create index if not exists idx_attendance_project    on attendance_entries(project_id);
create index if not exists idx_attendance_attendee   on attendance_entries(attendee_id);
create index if not exists idx_leaves_attendee       on leaves(attendee_id);
create index if not exists idx_memberships_project   on project_memberships(project_id);
create index if not exists idx_holidays_project      on holidays(project_id);
create index if not exists idx_user_profiles_email    on user_profiles(email);
create index if not exists idx_user_profiles_provider on user_profiles(provider);

-- ── Notifications (in-app alert inbox) ───────────────────────────────────────
create table if not exists notifications (
  id              uuid        primary key default gen_random_uuid(),
  user_id         uuid        not null references auth.users(id) on delete cascade,
  alert_type      text        not null,
  title           text        not null,
  message         text        not null,
  related_data    jsonb,
  is_read         boolean     not null default false,
  is_dismissed    boolean     not null default false,
  created_at      timestamptz not null default now(),
  read_at         timestamptz
);

-- ── Notification Settings (admin config per account) ─────────────────────────
create table if not exists notification_settings (
  id                   uuid        primary key default gen_random_uuid(),
  config_key           text        not null unique,
  enabled_alerts       jsonb       not null default '{}',
  delivery_method      text        not null default 'email'
                                   check (delivery_method in ('email','slack','both')),
  reminder_time        text        not null default '09:45',
  late_threshold       integer     not null default 5,
  sendgrid_api_key     text        not null default '',
  sendgrid_from_email  text        not null default '',
  slack_webhook_url    text        not null default '',
  recipients           jsonb       not null default '[]',
  updated_at           timestamptz not null default now()
);

alter table notifications         enable row level security;
alter table notification_settings enable row level security;

drop policy if exists "auth_read_notifications"   on notifications;
drop policy if exists "auth_write_notifications"  on notifications;
drop policy if exists "auth_read_notif_settings"  on notification_settings;
drop policy if exists "auth_write_notif_settings" on notification_settings;

create policy "auth_read_notifications"   on notifications         for select to authenticated using (true);
create policy "auth_write_notifications"  on notifications         for all    to authenticated using (true) with check (true);
create policy "auth_read_notif_settings"  on notification_settings for select to authenticated using (true);
create policy "auth_write_notif_settings" on notification_settings for all    to authenticated using (true) with check (true);

create index if not exists idx_notifications_user_id on notifications(user_id);
create index if not exists idx_notifications_is_read on notifications(is_read);
create index if not exists idx_notifications_created on notifications(created_at desc);

-- ── Bootstrap Admin Membership ────────────────────────────────────────────────
-- Grants the first admin owner_pmo access across all projects.
-- Safe to re-run (INSERT ... ON CONFLICT DO NOTHING).
-- Replace the email below if your admin email changes.
--
-- NOTE: Run this AFTER inserting at least one project row, or it will insert
-- nothing (no projects to join). If you have projects already, run as-is.
insert into project_memberships (project_id, user_name, user_email, role)
select id, 'Admin', 'ashu33031@gmail.com', 'owner_pmo'
from   projects
on conflict (project_id, user_email) do update set role = 'owner_pmo';

-- ── Chat History (Gemini AI Assistant) ────────────────────────────────────────
-- Conversations and messages for the in-app AI chat.

create table if not exists chat_conversations (
  id          uuid        primary key default gen_random_uuid(),
  user_id     uuid        references auth.users(id) on delete cascade,
  title       text,                        -- auto-generated from first message
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create table if not exists chat_messages (
  id              uuid        primary key default gen_random_uuid(),
  conversation_id uuid        not null references chat_conversations(id) on delete cascade,
  user_id         uuid        references auth.users(id) on delete set null,
  role            text        not null check (role in ('user', 'assistant', 'system')),
  content         text        not null,
  created_at      timestamptz not null default now()
);

-- Indexes for fast per-user and per-conversation lookups
create index if not exists idx_chat_conv_user     on chat_conversations(user_id);
create index if not exists idx_chat_msg_conv      on chat_messages(conversation_id);
create index if not exists idx_chat_msg_created   on chat_messages(conversation_id, created_at);

-- Auto-update updated_at on conversations when new messages arrive
create or replace function update_conversation_timestamp()
returns trigger language plpgsql as $$
begin
  update chat_conversations set updated_at = now() where id = new.conversation_id;
  return new;
end;
$$;

drop trigger if exists trg_chat_msg_update_conv on chat_messages;
create trigger trg_chat_msg_update_conv
  after insert on chat_messages
  for each row execute function update_conversation_timestamp();

-- Row-level security: Users can only see their own conversations and messages
alter table chat_conversations enable row level security;
alter table chat_messages      enable row level security;

drop policy if exists "chat_own_conversations" on chat_conversations;
drop policy if exists "chat_own_messages"      on chat_messages;

-- Users can only see their own conversations
create policy "chat_own_conversations" on chat_conversations
  for all using (auth.uid() = user_id);

-- Users can only see messages in their own conversations
create policy "chat_own_messages" on chat_messages
  for all using (
    conversation_id in (
      select id from chat_conversations where user_id = auth.uid()
    )
  );
-- ── Blockers ──────────────────────────────────────────────────────────────────
create table if not exists blockers (
  id                  uuid        primary key default gen_random_uuid(),
  project_id          uuid        not null references projects(id) on delete cascade,
  attendee_id         uuid        not null references attendees(id) on delete cascade,
  reported_date       date        not null,
  reported_by         text        not null,  -- user email
  description         text        not null default '',
  severity            text        not null default 'high'
                                  check (severity in ('critical', 'high', 'medium', 'low')),
  status              text        not null default 'open'
                                  check (status in ('open', 'in_progress', 'resolved')),
  resolved_date       date,
  resolved_by         text,
  related_data        jsonb,
  notes               text        not null default '',
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

-- Indexes for fast queries
create index if not exists idx_blockers_project    on blockers(project_id);
create index if not exists idx_blockers_attendee   on blockers(attendee_id);
create index if not exists idx_blockers_status     on blockers(status);
create index if not exists idx_blockers_severity   on blockers(severity);
create index if not exists idx_blockers_date       on blockers(reported_date);
create index if not exists idx_blockers_created    on blockers(created_at desc);

-- RLS
alter table blockers enable row level security;

-- ── Scrum Session History ────────────────────────────────────────────────────
-- Tracks each scrum session (start and end times) for reporting and future defaults
create table if not exists scrum_sessions (
  id              uuid        primary key default gen_random_uuid(),
  project_id      uuid        not null references projects(id) on delete cascade,
  session_date    date        not null,
  scrum_start_time text      not null,  -- "HH:MM" format
  scrum_end_time  text        not null,  -- "HH:MM" format
  duration_minutes integer    not null default 0,
  attendees_marked integer    not null default 0,
  created_at      timestamptz not null default now(),
  unique (project_id, session_date)
);

-- ── Attendance Rules (Project-level defaults) ────────────────────────────────
-- Stores default scrum time and rules for each project
create table if not exists attendance_rules (
  id              uuid        primary key default gen_random_uuid(),
  project_id      uuid        not null unique references projects(id) on delete cascade,
  default_scrum_start_time text not null,  -- "HH:MM" format (e.g., "10:00")
  default_scrum_end_time   text not null,  -- "HH:MM" format (e.g., "10:30")
  grace_period_minutes    integer not null default 5,
  late_threshold_minutes  integer not null default 0,
  auto_mark_absent_after  integer,  -- minutes after scrum start, null = never
  working_days            text    not null default 'mon,tue,wed,thu,fri', -- comma-separated
  timezone                text    not null default 'Asia/Kolkata',
  created_at              timestamptz not null default now(),
  updated_at              timestamptz not null default now()
);

-- ── Enable RLS ────────────────────────────────────────────────────────────────
alter table scrum_sessions    enable row level security;
alter table attendance_rules  enable row level security;

-- ── RLS Policies ──────────────────────────────────────────────────────────────
-- All authenticated users can read
create policy "auth_read_scrum_sessions"   on scrum_sessions   for select to authenticated using (true);
create policy "auth_read_attendance_rules" on attendance_rules for select to authenticated using (true);

-- All authenticated users can write
create policy "auth_write_scrum_sessions"   on scrum_sessions   for all to authenticated using (true) with check (true);
create policy "auth_write_attendance_rules" on attendance_rules for all to authenticated using (true) with check (true);

-- ── Indexes ───────────────────────────────────────────────────────────────────
create index if not exists idx_scrum_sessions_project on scrum_sessions(project_id);
create index if not exists idx_scrum_sessions_date    on scrum_sessions(session_date);
create index if not exists idx_attendance_rules_project on attendance_rules(project_id);

-- ── Bootstrap Attendance Rules ────────────────────────────────────────────────
-- Initializes default attendance rules for all existing projects.
-- Uses project's scrum_time as the default start time, with 30-min duration.
-- Safe to re-run (INSERT ... ON CONFLICT DO NOTHING).
--
-- This ensures every project has attendance rules configured from the start.
-- Formula: End time = Start time + 30 minutes
-- Example: If scrum_time = "10:00", end_time = "10:30"
--
-- NOTE: This query runs AFTER projects are created. Manually adjust end times
-- if your projects have different scrum durations (e.g., 45 mins, 1 hour, etc.)
insert into attendance_rules (
  project_id,
  default_scrum_start_time,
  default_scrum_end_time,
  grace_period_minutes,
  late_threshold_minutes,
  working_days,
  timezone
)
select
  p.id,
  p.scrum_time as default_scrum_start_time,
  case
    when p.scrum_time like '__:00' then LPAD((CAST(SUBSTRING(p.scrum_time, 1, 2) as integer) * 60 + 30) / 60 || '', 2, '0') || ':30'
    when p.scrum_time like '__:15' then LPAD((CAST(SUBSTRING(p.scrum_time, 1, 2) as integer) * 60 + 45) / 60 || '', 2, '0') || ':45'
    when p.scrum_time like '__:30' then LPAD((CAST(SUBSTRING(p.scrum_time, 1, 2) as integer) * 60 + 60) / 60 || '', 2, '0') || ':00'
    when p.scrum_time like '__:45' then LPAD((CAST(SUBSTRING(p.scrum_time, 1, 2) as integer) * 60 + 75) / 60 || '', 2, '0') || ':15'
    else '10:30'
  end as default_scrum_end_time,
  p.late_grace_minutes,
  0,
  'mon,tue,wed,thu,fri',
  p.scrum_timezone
from projects p
where p.status = 'active'
on conflict (project_id) do nothing;