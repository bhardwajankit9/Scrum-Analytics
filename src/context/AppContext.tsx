import { createContext, useContext, useState, ReactNode } from 'react'
import { mockProjects, mockAttendees, mockTodayAttendance, Project, Attendee } from '../data/mockData'

// ─── Additional Types ─────────────────────────────────────────────────────────

export interface Holiday {
  id: string
  project_id: string
  holiday_date: string // YYYY-MM-DD
  name: string
}

export interface Leave {
  id: string
  project_id: string
  attendee_id: string
  start_date: string
  end_date: string
  reason: string
  approved_by: string
  created_at: string
}

export interface AttendanceEntry {
  id: string
  project_id: string
  attendee_id: string
  date: string        // YYYY-MM-DD
  join_time: string | null // HH:MM 24h
  status: 'present' | 'late' | 'absent'
  minutes_late: number
  work_mode: 'office' | 'wfh' | null
  notes: string
  marked_by: string
  marked_at: string
}

export interface ProjectMembership {
  id: string
  project_id: string
  user_name: string
  user_email: string
  role: 'owner_pmo' | 'pmo' | 'viewer'
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function toTime24(t: string | null): string | null {
  if (!t) return null
  if (/^\d{2}:\d{2}$/.test(t)) return t
  const [time, period] = t.split(' ')
  if (!period) return t
  const [h, m] = time.split(':').map(Number)
  if (period === 'PM' && h !== 12) return `${String(h + 12).padStart(2, '0')}:${String(m).padStart(2, '0')}`
  if (period === 'AM' && h === 12) return `00:${String(m).padStart(2, '0')}`
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
}

// ─── Seed today's attendance from mock ───────────────────────────────────────

const today = new Date().toISOString().slice(0, 10)

const seededAttendance: AttendanceEntry[] = mockTodayAttendance.map((r, i) => ({
  id: `seed_${i}`,
  project_id: mockProjects.find(p => p.name === r.project_name)?.id ?? 'p1',
  attendee_id: r.attendee.id,
  date: today,
  join_time: toTime24(r.join_time),
  status: r.status,
  minutes_late: r.minutes_late,
  work_mode: r.work_mode,
  notes: '',
  marked_by: r.marked_by,
  marked_at: new Date().toISOString(),
}))

// ─── Seed data ────────────────────────────────────────────────────────────────

const seedHolidays: Holiday[] = [
  { id: 'h1', project_id: 'p1', holiday_date: '2026-04-14', name: 'Dr. Ambedkar Jayanti' },
  { id: 'h2', project_id: 'p2', holiday_date: '2026-04-14', name: 'Dr. Ambedkar Jayanti' },
  { id: 'h3', project_id: 'p3', holiday_date: '2026-04-14', name: 'Dr. Ambedkar Jayanti' },
  { id: 'h4', project_id: 'p1', holiday_date: '2026-04-21', name: 'Ram Navami' },
  { id: 'h5', project_id: 'p2', holiday_date: '2026-04-21', name: 'Ram Navami' },
]

const seedLeaves: Leave[] = [
  { id: 'l1', project_id: 'p1', attendee_id: 'a1', start_date: '2026-04-20', end_date: '2026-04-22', reason: 'Personal', approved_by: 'Admin User', created_at: new Date().toISOString() },
  { id: 'l2', project_id: 'p2', attendee_id: 'a5', start_date: '2026-04-15', end_date: '2026-04-25', reason: 'Medical Leave', approved_by: 'Admin User', created_at: new Date().toISOString() },
]

const seedMemberships: ProjectMembership[] = [
  { id: 'm1', project_id: 'p1', user_name: 'Admin User',  user_email: 'admin@company.com',  role: 'owner_pmo' },
  { id: 'm2', project_id: 'p2', user_name: 'Admin User',  user_email: 'admin@company.com',  role: 'owner_pmo' },
  { id: 'm3', project_id: 'p3', user_name: 'Admin User',  user_email: 'admin@company.com',  role: 'pmo'       },
  { id: 'm4', project_id: 'p1', user_name: 'John PMO',    user_email: 'john@company.com',   role: 'pmo'       },
  { id: 'm5', project_id: 'p2', user_name: 'Sara Viewer', user_email: 'sara@company.com',   role: 'viewer'    },
  { id: 'm6', project_id: 'p3', user_name: 'Raj PMO',     user_email: 'raj@company.com',    role: 'pmo'       },
]

// ─── Context ──────────────────────────────────────────────────────────────────

interface AppContextType {
  projects: Project[]
  attendees: Attendee[]
  attendanceRecords: AttendanceEntry[]
  holidays: Holiday[]
  leaves: Leave[]
  memberships: ProjectMembership[]

  addProject: (p: Omit<Project, 'id'>) => void
  updateProject: (id: string, p: Partial<Project>) => void

  addAttendee: (a: Omit<Attendee, 'id'>) => void
  updateAttendee: (id: string, a: Partial<Attendee>) => void
  deleteAttendee: (id: string) => void

  saveAttendance: (entries: AttendanceEntry[]) => void
  getAttendanceForDate: (project_id: string, date: string) => AttendanceEntry[]
  addManualEntry: (entry: AttendanceEntry) => void

  addHoliday: (h: Omit<Holiday, 'id'>) => void
  deleteHoliday: (id: string) => void

  addLeave: (l: Omit<Leave, 'id'>) => void
  deleteLeave: (id: string) => void

  addMembership: (m: Omit<ProjectMembership, 'id'>) => void
  deleteMembership: (id: string) => void
}

const AppContext = createContext<AppContextType | null>(null)

export function AppProvider({ children }: { children: ReactNode }) {
  const [projects, setProjects]     = useState<Project[]>(mockProjects)
  const [attendees, setAttendees]   = useState<Attendee[]>(mockAttendees)
  const [attendanceRecords, setRec] = useState<AttendanceEntry[]>(seededAttendance)
  const [holidays, setHolidays]     = useState<Holiday[]>(seedHolidays)
  const [leaves, setLeaves]         = useState<Leave[]>(seedLeaves)
  const [memberships, setMemberships] = useState<ProjectMembership[]>(seedMemberships)

  const addProject = (p: Omit<Project, 'id'>) =>
    setProjects(prev => [...prev, { ...p, id: `p${Date.now()}` }])

  const updateProject = (id: string, p: Partial<Project>) =>
    setProjects(prev => prev.map(proj => proj.id === id ? { ...proj, ...p } : proj))

  const addAttendee = (a: Omit<Attendee, 'id'>) =>
    setAttendees(prev => [...prev, { ...a, id: `a${Date.now()}` }])

  const updateAttendee = (id: string, a: Partial<Attendee>) =>
    setAttendees(prev => prev.map(att => att.id === id ? { ...att, ...a } : att))

  const deleteAttendee = (id: string) =>
    setAttendees(prev => prev.filter(a => a.id !== id))

  const saveAttendance = (entries: AttendanceEntry[]) => {
    if (!entries.length) return
    setRec(prev => {
      const filtered = prev.filter(
        r => !(r.project_id === entries[0].project_id && r.date === entries[0].date)
      )
      return [...filtered, ...entries]
    })
  }

  const addManualEntry = (entry: AttendanceEntry) =>
    setRec(prev => {
      const filtered = prev.filter(
        r => !(r.project_id === entry.project_id && r.attendee_id === entry.attendee_id && r.date === entry.date)
      )
      return [...filtered, entry]
    })

  const getAttendanceForDate = (project_id: string, date: string) =>
    attendanceRecords.filter(r => r.project_id === project_id && r.date === date)

  const addHoliday = (h: Omit<Holiday, 'id'>) =>
    setHolidays(prev => [...prev, { ...h, id: `h${Date.now()}` }])

  const deleteHoliday = (id: string) =>
    setHolidays(prev => prev.filter(h => h.id !== id))

  const addLeave = (l: Omit<Leave, 'id'>) =>
    setLeaves(prev => [...prev, { ...l, id: `l${Date.now()}`, created_at: new Date().toISOString() }])

  const deleteLeave = (id: string) =>
    setLeaves(prev => prev.filter(l => l.id !== id))

  const addMembership = (m: Omit<ProjectMembership, 'id'>) =>
    setMemberships(prev => [...prev, { ...m, id: `m${Date.now()}` }])

  const deleteMembership = (id: string) =>
    setMemberships(prev => prev.filter(m => m.id !== id))

  return (
    <AppContext.Provider value={{
      projects, attendees, attendanceRecords, holidays, leaves, memberships,
      addProject, updateProject,
      addAttendee, updateAttendee, deleteAttendee,
      saveAttendance, getAttendanceForDate, addManualEntry,
      addHoliday, deleteHoliday,
      addLeave, deleteLeave,
      addMembership, deleteMembership,
    }}>
      {children}
    </AppContext.Provider>
  )
}

export function useApp() {
  const ctx = useContext(AppContext)
  if (!ctx) throw new Error('useApp must be used inside AppProvider')
  return ctx
}

export { toTime24 }
