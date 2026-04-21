// ─── Repository Interfaces (Dependency Inversion Principle) ──────────────────
// All business logic depends on these abstractions, NOT on concrete implementations.
// Concrete implementations live in src/data/repositories/.

import type {
  Project, Attendee, AttendanceEntry,
  Holiday, Leave, ProjectMembership,
} from '../entities'

// ── IProjectRepository ────────────────────────────────────────────────────────

export interface IProjectRepository {
  readonly all: Project[]
  readonly loading?: boolean
  getById(id: string): Project | undefined
  add(p: Omit<Project, 'id'>): Project
  update(id: string, patch: Partial<Omit<Project, 'id'>>): Project
}

// ── IAttendeeRepository ───────────────────────────────────────────────────────

export interface IAttendeeRepository {
  readonly all: Attendee[]
  readonly loading?: boolean
  getById(id: string): Attendee | undefined
  add(a: Omit<Attendee, 'id'>): Attendee
  update(id: string, patch: Partial<Omit<Attendee, 'id'>>): Attendee
  remove(id: string): void
}

// ── IAttendanceRepository ─────────────────────────────────────────────────────

export interface IAttendanceRepository {
  readonly all: AttendanceEntry[]
  getByDate(date: string): AttendanceEntry[]
  getByProjectAndDate(projectId: string, date: string): AttendanceEntry[]
  getByAttendee(attendeeId: string): AttendanceEntry[]
  saveEntries(entries: AttendanceEntry[]): void   // upserts a full project×date batch
  addEntry(entry: AttendanceEntry): void           // upserts a single manual entry
  updateEntry(id: string, patch: Partial<Omit<AttendanceEntry, 'id'>>): void
  removeEntry(id: string): void
}

// ── IHolidayRepository ────────────────────────────────────────────────────────

export interface IHolidayRepository {
  readonly all: Holiday[]
  add(h: Omit<Holiday, 'id'>): Holiday
  remove(id: string): void
}

// ── ILeaveRepository ──────────────────────────────────────────────────────────

export interface ILeaveRepository {
  readonly all: Leave[]
  getByAttendee(attendeeId: string): Leave[]
  add(l: Omit<Leave, 'id'>): Leave
  remove(id: string): void
}

// ── IMembershipRepository ─────────────────────────────────────────────────────

export interface IMembershipRepository {
  readonly all: ProjectMembership[]
  getByProject(projectId: string): ProjectMembership[]
  add(m: Omit<ProjectMembership, 'id'>): ProjectMembership
  remove(id: string): void
}
