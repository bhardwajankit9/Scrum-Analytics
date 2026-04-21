# Scrum Participation & Discipline Analytics Platform (Phase 1)

**Platform:** Website (React via Expo Web / React Native Web) + Supabase (Postgres + Auth + RLS)

**Date:** 17 Apr 2026

## 0) Goal
A centralized mobile platform to track, analyze, and improve scrum discipline, participation, punctuality, and team behavior across projects.

This is **not just attendance**. It answers:
- Who is missing scrum?
- Who is late frequently (based on actual join time)?
- Is WFH affecting discipline?
- Which projects are unhealthy?

## 1) Phase 1 Architecture (Supabase Only)

**Web App (React via Expo Web / React Native Web)**
→ **Supabase Auth (Google)**
→ **Supabase Postgres (RLS enforced) + PostgREST API**
→ **SQL Views / Materialized Views** for analytics

No separate backend service in Phase 1.

## 2) Permissions Model (Project Membership)

### 2.1 Roles (per project)
- **Owner PMO (`owner_pmo`)**: manages project settings + memberships + all PMO actions
- **PMO (`pmo`)**: marks attendance, manages attendees/mapping, manages holidays/leaves (within the project)
- **Viewer (`viewer`)**: read-only access to the project

### 2.2 Access rules
- A user can only access a project if they have a membership row for that project.
- Viewers cannot insert/update/delete anything (RLS enforced).
- PMOs can only write within projects where they are `pmo` or `owner_pmo`.

## 3) Data Model (Final — Analytics + WFH + Join-Time Ready)

> NOTE: Table names are suggestions; keep constraints and relationships as specified.

### 3.1 users (app users)
- `id` (uuid, PK, references `auth.users(id)`)
- `name` (text)
- `email` (text, unique)
- `created_at` (timestamptz, default `now()`)

### 3.2 projects
- `id` (uuid, PK)
- `name` (text)
- `description` (text)
- `scrum_time` (time, default 10:15)
- `scrum_timezone` (text, IANA timezone like `Asia/Kolkata`) **required**
- `late_grace_minutes` (int, default 0 or 5 — choose one)
- `created_by` (uuid → users.id)
- `status` (text: `active` / `archived`)
- `created_at` (timestamptz)

### 3.3 attendees (people tracked)
- `id` (uuid, PK)
- `name` (text)
- `email` (text, optional)
- `employee_id` (text, recommended unique)
- `role` (text: `dev` / `qa` / `ba`)
- `created_at` (timestamptz)

### 3.4 project_memberships (NEW)
Defines which app users can access which projects.
- `id` (uuid, PK)
- `project_id` (uuid → projects.id)
- `user_id` (uuid → users.id)
- `role` (text: `owner_pmo` / `pmo` / `viewer`)
- `created_at` (timestamptz)

Constraints:
- Unique `(project_id, user_id)`

### 3.5 project_attendees
Maps attendees to projects.
- `project_id` (uuid → projects.id)
- `attendee_id` (uuid → attendees.id)
- `active_from` (date, default current_date)
- `active_to` (date, nullable)

Constraints:
- Unique `(project_id, attendee_id)`

### 3.6 attendance (CORE TABLE)
One row per project + attendee + date.

Required columns:
- `id` (uuid, PK)
- `project_id` (uuid)
- `attendee_id` (uuid)
- `date` (date) — scrum date in project timezone
- `join_time` (timestamptz, nullable)
- `status` (text: `present` / `late` / `absent`)
- `minutes_late` (int, default 0)
- `work_mode` (text: `office` / `wfh`, nullable)
- `notes` (text, optional)
- `marked_by` (uuid → users.id) — PMO user who saved/confirmed
- `created_at` (timestamptz)

Constraints (must-have):
- **Duplicate prevention:** Unique `(project_id, attendee_id, date)`
- If `status = 'absent'` then `join_time IS NULL` and `work_mode IS NULL`
- If `status IN ('present','late')` then `join_time IS NOT NULL` and `work_mode IN ('office','wfh')`

Audit requirements:
- Log edits and deletes (see `audit_logs` section)

### 3.7 project_holidays (NEW — expected denominator exclusions)
- `id` (uuid)
- `project_id` (uuid)
- `holiday_date` (date)
- `name` (text)

Constraints:
- Unique `(project_id, holiday_date)`

### 3.8 attendee_leaves (NEW — expected denominator exclusions)
- `id` (uuid)
- `project_id` (uuid)
- `attendee_id` (uuid)
- `start_date` (date)
- `end_date` (date)
- `reason` (text)
- `approved_by` (uuid → users.id)
- `created_at` (timestamptz)

### 3.9 audit_logs (light)
Track:
- Attendance updates
- Attendance deletes

Columns:
- `id` (bigint, identity)
- `action` (text)
- `user_id` (uuid)
- `metadata` (jsonb)
- `created_at` (timestamptz)

Implementation:
- Use DB triggers on `attendance` for insert/update/delete → write audit rows.
- Keep audit append-only (no updates/deletes from client roles).

## 4) Join-Time Based Punctuality (Late Computation)

**Requirement:** late should be computed from actual join time.

### 4.1 Definition
For a given project and attendance `date`:
- Expected scrum start timestamp = `date` + `projects.scrum_time` interpreted in `projects.scrum_timezone`
- Late if `join_time > expected_start + late_grace_minutes`
- `minutes_late` = minutes(join_time - expected_start)

### 4.2 How Phase 1 captures join_time
You must pick one path (both are Supabase-only):

1) **Attendee self check-in (recommended for “actual join time”)**
- Attendees authenticate and check-in to their project scrum in-app.
- App writes `join_time` using server time (via insert/RPC).

Data model note for self check-in:
- Because `attendees` are not the same as `users` in this product, you need a link:
  - Add `attendee_user_links(user_id, attendee_id)` with unique constraints, OR
  - Decide that every tracked attendee is also an app user (merge identity models).
- The simplest Phase 1 approach is `attendee_user_links` (one logged-in user maps to one attendee).

2) **PMO enters join time (fallback)**
- PMO inputs join time manually; computed late still works but accuracy depends on PMO input.

Phase 1 recommendation: include self check-in if “actual join time” is a hard requirement.

## 5) Auth & Security

### 5.1 Auth
- Google Login via Supabase Auth
- On first login: ensure a `users` row exists for `auth.uid()`

#### Web OAuth notes (recommended)
Supabase’s Google OAuth flow uses standard browser redirects.

Implementation outline (SPA/website):
- Choose a redirect URL that your site serves (example: `http://localhost:8081` during dev).
- Start OAuth:
  - `supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo } })`
- On redirect back to your site, let Supabase parse the URL and establish the session.

Notes:
- Configure the redirect URL(s) in Supabase Auth settings (Site URL + Additional Redirect URLs) and in Google Cloud OAuth settings.
- Prefer PKCE/code flow as supported by Supabase.

### 5.2 RLS Policy Intent (must enforce)
- Only logged-in users can access anything
- Membership-gated reads (project-scoped)
- PMO-only writes

Policy overview:
- `projects`: SELECT only via membership; INSERT/UPDATE only for owner_pmo
- `project_memberships`: SELECT for members; INSERT/UPDATE/DELETE only owner_pmo
- `attendees`: SELECT for members (via join through project_attendees); PMO-only writes
- `project_attendees`: SELECT for members; PMO-only writes
- `attendance`: SELECT for members; PMO-only insert/update/delete
- `project_holidays`, `attendee_leaves`: SELECT for members; PMO-only writes
- `audit_logs`: SELECT PMO (or project members if acceptable); INSERT only via triggers

## 6) Core Features (MUST BUILD)

### 6.1 Project Management
- Create multiple projects
- Set scrum time (default 10:15 AM) + timezone
- Activate / archive project
- Manage project memberships (add PMO/viewer)

### 6.2 Attendee Management
- Add / edit / delete attendee
- Map attendee to multiple projects
- Active ranges (active_from/active_to)

### 6.3 Attendance Marking (Main Engine)
PMO flow:
- Select project
- Select date
- Load attendees mapped + active
- Quick mode:
  - Mark all present
  - Choose work mode default (Office/WFH)
  - Edit exceptions (absent/notes)
- Save

Capture:
- PMO `marked_by`
- timestamp
- join_time (from self check-in or PMO input)

Multi-PMO tracking:
- Always show “Marked by {PMO} at {time}”

Audit (light):
- Attendance edits
- Attendance deletes

### 6.4 Profile Screen
- User info
- Personal stats

## 7) Analytics & Dashboard (Key Differentiator)

### 7.1 Expected Attendance Denominator
**Requirement:** weekends/holidays/approved leave reduce expected denominator.

Expected days for an attendee within a project and period should exclude:
- weekends (define rule: Sat/Sun non-working unless configured)
- project_holidays
- attendee_leaves (approved)
- days outside `project_attendees.active_from/active_to`

### 7.2 Metrics
Project level:
- Attendance %
- Late %
- **WFH % monthly** (explicit requirement)

User level:
- Attendance %
- Late frequency
- Consistency score (define in metrics doc)

### 7.3 Defaulter Detection
- Attendance < 70%
- Frequent late users (define threshold)

### 7.4 Discipline Score
Discipline = (Attendance% * 0.7) + (On-time% * 0.3)

### 7.5 Project Health Score
Health = Attendance + Punctuality + Consistency (weights defined and fixed)

### 7.6 Calendar View
- Monthly heatmap
- Tap day → details

### 7.7 Implementation strategy
- Create SQL views for daily and monthly rollups
- Use materialized views only if needed for performance

## 8) Gamification (Phase 1)
- Leaderboard (monthly)
- Badges:
  - 100% attendance (monthly)
  - no late streak
  - top performer

Keep logic computed from attendance + expected days (no complex state machine).

## 9) Reporting
- Export CSV (Excel-friendly)
- Project-wise reports
- Date range filters

Mobile export approach:
- Generate CSV client-side and share/download
- Or route via Supabase function (optional)

## 10) Filters & Search
- By project
- By user/attendee
- By date range
- By PMO
- By status and work_mode

## 11) Reminders (10:10)
Phase 1 approach (no backend scheduler required):
- In-app banner after 10:10 local time if attendance not marked

Optional:
- Expo local notifications on PMO devices (best-effort)

## 12) Milestones / Execution Plan

### Milestone A — Foundations
- Expo app + Supabase Auth working
- users row created on first login
- membership-based project list

### Milestone B — Project + Memberships
- create/archive projects
- add/remove PMO/viewer memberships

### Milestone C — Attendees
- attendee CRUD
- map attendees to projects

### Milestone D — Attendance Engine
- quick mode + exceptions
- join_time capture path chosen
- late computed and stored
- audit logs for edits/deletes

### Milestone E — Analytics + Calendar
- expected denominator exclusions
- dashboard KPIs
- defaulters + scores
- monthly WFH%
- calendar heatmap

### Milestone F — Reports + Gamification
- CSV exports with filters
- leaderboard + badges

## 13) Decisions to Lock (to avoid rework)
1) Join-time capture method in Phase 1: self check-in vs PMO entry
2) Weekend rule: fixed Sat/Sun non-working vs configurable per project
3) Default `late_grace_minutes`
