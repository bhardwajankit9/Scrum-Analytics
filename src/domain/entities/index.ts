// ─── Core Domain Entity Types ─────────────────────────────────────────────────
// Pure TypeScript – zero framework/library dependencies.
// This is the innermost ring of Clean Architecture.

// ── Project ───────────────────────────────────────────────────────────────────

export interface Project {
  readonly id: string
  readonly name: string
  readonly description: string
  readonly scrum_time: string        // "HH:MM" 24 h
  readonly scrum_timezone: string
  readonly status: ProjectStatus
  readonly late_grace_minutes: number
}

export type ProjectStatus = 'active' | 'archived'

// ── Attendee ──────────────────────────────────────────────────────────────────

export interface Attendee {
  readonly id: string
  readonly name: string
  readonly email: string
  readonly employee_id: string
  readonly role: AttendeeRole
  readonly project: string           // project name (display)
  readonly manager: string
  readonly status: AttendeeStatus
}

export type AttendeeRole   = 'dev' | 'qa' | 'ba' | 'lead'
export type AttendeeStatus = 'active' | 'on_leave' | 'inactive'

// ── AttendanceEntry ───────────────────────────────────────────────────────────

export interface AttendanceEntry {
  readonly id: string
  readonly project_id: string
  readonly attendee_id: string
  readonly date: string              // "YYYY-MM-DD"
  readonly join_time: string | null  // "HH:MM" 24 h
  readonly status: AttendanceStatus
  readonly minutes_late: number
  readonly work_mode: WorkMode | null
  readonly notes: string
  readonly marked_by: string
  readonly marked_at: string
}

export type AttendanceStatus = 'present' | 'late' | 'absent'
export type WorkMode         = 'office' | 'wfh'

// ── Holiday ───────────────────────────────────────────────────────────────────

export interface Holiday {
  readonly id: string
  readonly project_id: string
  readonly holiday_date: string      // "YYYY-MM-DD"
  readonly name: string
}

// ── Leave ─────────────────────────────────────────────────────────────────────

export interface Leave {
  readonly id: string
  readonly project_id: string
  readonly attendee_id: string
  readonly start_date: string
  readonly end_date: string
  readonly reason: string
  readonly approved_by: string
  readonly created_at: string
}

// ── ProjectMembership ─────────────────────────────────────────────────────────

export interface ProjectMembership {
  readonly id: string
  readonly project_id: string
  readonly user_name: string
  readonly user_email: string
  readonly role: MembershipRole
}

export type MembershipRole = 'owner_pmo' | 'pmo' | 'viewer'

// ── Report / Alert helpers ────────────────────────────────────────────────────

export interface DailyReportRow {
  date: string
  day: string
  total: number
  present: number
  late: number
  absent: number
  rate: number
}

export interface ActionAlert {
  id: string
  type: 'error' | 'warning' | 'info'
  title: string
  description: string
  time_ago: string
}
