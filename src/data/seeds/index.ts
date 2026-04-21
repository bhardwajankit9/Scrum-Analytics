// ─── Seed / Mock Data ─────────────────────────────────────────────────────────
// Raw test fixtures using domain entity types.
// Lives in the data layer; screens and use cases NEVER import directly from here.

import type {
  Project, Attendee, AttendanceEntry,
  Holiday, Leave, ProjectMembership,
  ActionAlert,
} from '../../domain/entities'
import { toTime24 } from '../../domain/usecases'

// ── Projects ──────────────────────────────────────────────────────────────────

export const SEED_PROJECTS: Project[] = [
  { id: 'p1', name: 'Project Alpha', description: 'Frontend Team', scrum_time: '10:15', scrum_timezone: 'Asia/Kolkata', status: 'active',   late_grace_minutes: 5 },
  { id: 'p2', name: 'Project Beta',  description: 'Backend Team',  scrum_time: '10:15', scrum_timezone: 'Asia/Kolkata', status: 'active',   late_grace_minutes: 5 },
  { id: 'p3', name: 'Project Gamma', description: 'QA Team',       scrum_time: '10:15', scrum_timezone: 'Asia/Kolkata', status: 'active',   late_grace_minutes: 0 },
  { id: 'p4', name: 'Project Delta', description: 'DevOps Team',   scrum_time: '10:30', scrum_timezone: 'Asia/Kolkata', status: 'archived', late_grace_minutes: 0 },
]

// ── Attendees ─────────────────────────────────────────────────────────────────

export const SEED_ATTENDEES: Attendee[] = [
  { id: 'a1',  name: 'Sarah Johnson',    email: 'sarah.j@company.com',    employee_id: 'EMP-2847', role: 'dev', project: 'Project Alpha', manager: 'Michael Chen',  status: 'active'   },
  { id: 'a2',  name: 'Michael Chen',     email: 'michael.c@company.com',  employee_id: 'EMP-2651', role: 'dev', project: 'Project Beta',  manager: '—',             status: 'active'   },
  { id: 'a3',  name: 'Emily Rodriguez',  email: 'emily.r@company.com',    employee_id: 'EMP-3092', role: 'qa',  project: 'Project Alpha', manager: 'Robert Taylor', status: 'active'   },
  { id: 'a4',  name: 'David Kumar',      email: 'david.k@company.com',    employee_id: 'EMP-2413', role: 'dev', project: 'Project Gamma', manager: 'Sarah Johnson', status: 'active'   },
  { id: 'a5',  name: 'Jessica Williams', email: 'jessica.w@company.com',  employee_id: 'EMP-2789', role: 'ba',  project: 'Project Beta',  manager: '—',             status: 'on_leave' },
  { id: 'a6',  name: 'Robert Taylor',    email: 'robert.t@company.com',   employee_id: 'EMP-3156', role: 'dev', project: 'Project Alpha', manager: '—',             status: 'active'   },
  { id: 'a7',  name: 'Amanda Lee',       email: 'amanda.l@company.com',   employee_id: 'EMP-2934', role: 'qa',  project: 'Project Gamma', manager: 'Lisa Anderson', status: 'active'   },
  { id: 'a8',  name: 'James Wilson',     email: 'james.w@company.com',    employee_id: 'EMP-2201', role: 'ba',  project: 'Project Beta',  manager: 'Karen Davis',   status: 'active'   },
  { id: 'a9',  name: 'Karen Davis',      email: 'karen.d@company.com',    employee_id: 'EMP-1934', role: 'ba',  project: 'Project Alpha', manager: '—',             status: 'active'   },
  { id: 'a10', name: 'Lisa Anderson',    email: 'lisa.a@company.com',     employee_id: 'EMP-2105', role: 'qa',  project: 'Project Gamma', manager: '—',             status: 'active'   },
]

// ── Seeded Attendance (today) ─────────────────────────────────────────────────

const TODAY = new Date().toISOString().slice(0, 10)

type RawAttendance = {
  id: string; project_id: string; attendee_id: string
  join_time: string | null; status: AttendanceEntry['status']
  minutes_late: number; work_mode: AttendanceEntry['work_mode']; notes: string; marked_by: string
}

const RAW_ATTENDANCE: RawAttendance[] = [
  { id: 'seed_0', project_id: 'p1', attendee_id: 'a1', join_time: '10:12 AM', status: 'present', minutes_late: 0, work_mode: 'office', notes: '',           marked_by: 'Admin User' },
  { id: 'seed_1', project_id: 'p2', attendee_id: 'a2', join_time: '10:22 AM', status: 'late',    minutes_late: 7, work_mode: 'wfh',    notes: '',           marked_by: 'Admin User' },
  { id: 'seed_2', project_id: 'p1', attendee_id: 'a3', join_time: '10:10 AM', status: 'present', minutes_late: 0, work_mode: 'office', notes: '',           marked_by: 'Admin User' },
  { id: 'seed_3', project_id: 'p3', attendee_id: 'a4', join_time: null,       status: 'absent',  minutes_late: 0, work_mode: null,     notes: '',           marked_by: 'Admin User' },
  { id: 'seed_4', project_id: 'p2', attendee_id: 'a5', join_time: '10:18 AM', status: 'late',    minutes_late: 3, work_mode: 'wfh',    notes: 'On leave',   marked_by: 'Admin User' },
]

export const SEED_ATTENDANCE: AttendanceEntry[] = RAW_ATTENDANCE.map(r => ({
  ...r,
  date:     TODAY,
  join_time: toTime24(r.join_time),
  marked_at: new Date().toISOString(),
}))

// ── Holidays ──────────────────────────────────────────────────────────────────

export const SEED_HOLIDAYS: Holiday[] = [
  { id: 'h1', project_id: 'p1', holiday_date: '2026-04-14', name: 'Dr. Ambedkar Jayanti' },
  { id: 'h2', project_id: 'p2', holiday_date: '2026-04-14', name: 'Dr. Ambedkar Jayanti' },
  { id: 'h3', project_id: 'p3', holiday_date: '2026-04-14', name: 'Dr. Ambedkar Jayanti' },
  { id: 'h4', project_id: 'p1', holiday_date: '2026-04-21', name: 'Ram Navami' },
  { id: 'h5', project_id: 'p2', holiday_date: '2026-04-21', name: 'Ram Navami' },
]

// ── Leaves ────────────────────────────────────────────────────────────────────

export const SEED_LEAVES: Leave[] = [
  { id: 'l1', project_id: 'p1', attendee_id: 'a1', start_date: '2026-04-20', end_date: '2026-04-22', reason: 'Personal',      approved_by: 'Admin User', created_at: new Date().toISOString() },
  { id: 'l2', project_id: 'p2', attendee_id: 'a5', start_date: '2026-04-15', end_date: '2026-04-25', reason: 'Medical Leave', approved_by: 'Admin User', created_at: new Date().toISOString() },
]

// ── Memberships ───────────────────────────────────────────────────────────────

export const SEED_MEMBERSHIPS: ProjectMembership[] = [
  { id: 'm1', project_id: 'p1', user_name: 'Admin User',  user_email: 'admin@company.com', role: 'owner_pmo' },
  { id: 'm2', project_id: 'p2', user_name: 'Admin User',  user_email: 'admin@company.com', role: 'owner_pmo' },
  { id: 'm3', project_id: 'p3', user_name: 'Admin User',  user_email: 'admin@company.com', role: 'pmo'       },
  { id: 'm4', project_id: 'p1', user_name: 'John PMO',    user_email: 'john@company.com',  role: 'pmo'       },
  { id: 'm5', project_id: 'p2', user_name: 'Sara Viewer', user_email: 'sara@company.com',  role: 'viewer'    },
  { id: 'm6', project_id: 'p3', user_name: 'Raj PMO',     user_email: 'raj@company.com',   role: 'pmo'       },
]

// ── Mock Alerts (Dashboard right-panel) ───────────────────────────────────────

export const MOCK_ALERTS: ActionAlert[] = [
  { id: 'al1', type: 'error',   title: 'Missing Punch-in',        description: 'David Kumar has not punched in for Project Gamma today.',      time_ago: '5 min ago'   },
  { id: 'al2', type: 'warning', title: 'Late Arrival Pattern',    description: 'Michael Chen is late for the 3rd consecutive day.',             time_ago: '12 min ago'  },
  { id: 'al3', type: 'info',    title: 'Holiday Tomorrow',        description: 'Ram Navami on Apr 21 – no scrum required for Alpha & Beta.',    time_ago: '1 hour ago'  },
]
