// ─── Dashboard ViewModel ──────────────────────────────────────────────────────
// Owns all business state for DashboardScreen.
// Exposes only what the View needs — the View is free of useMemo / business logic.

import { useState, useMemo, useCallback } from 'react'
import { useContainer } from '../../infrastructure/di/RepositoryProvider'
import { ExportCSVUseCase }  from '../../domain/usecases'
import type { AttendanceEntry, Attendee, Project } from '../../domain/entities'

// ─── CSV Strategy ─────────────────────────────────────────────────────────────
type AttendanceRow = Record<string, string | number>
const attendanceStrategy = {
  format(rows: unknown[]): AttendanceRow[] {
    return (rows as Array<{ entry: AttendanceEntry; attendee?: Attendee; project?: Project }>).map(
      ({ entry, attendee, project }) => ({
        Date:            entry.date,
        Name:            attendee?.name ?? entry.attendee_id,
        Project:         project?.name  ?? entry.project_id,
        Status:          entry.status,
        'Join Time':     entry.join_time ?? '—',
        'Work Mode':     entry.work_mode ?? '—',
        'Minutes Late':  String(entry.minutes_late),
        Notes:           entry.notes,
      })
    )
  },
  filename: (from: string, to: string) => `attendance_${from}_${to}.csv`,
}
const exporter = new ExportCSVUseCase()

// ─── ViewModel interface ──────────────────────────────────────────────────────
export interface DashboardViewModel {
  // Data
  projects:        Project[]
  attendees:       Attendee[]
  // Filters (controlled by ViewModel so they can be reset atomically)
  filterDate:      string;  setFilterDate:    (v: string) => void
  filterProject:   string;  setFilterProject: (v: string) => void
  filterStatus:    string;  setFilterStatus:  (v: string) => void
  filterMode:      string;  setFilterMode:    (v: string) => void
  search:          string;  setSearch:        (v: string) => void
  reset:           () => void
  // Derived
  filtered:        AttendanceEntry[]
  dateLabel:       string
  presentCount:    number
  lateCount:       number
  absentCount:     number
  total:           number
  projectAttendance: { id: string; project: string; present: number; late: number; absent: number; total: number }[]
  // Actions
  addManualEntry:  (entry: AttendanceEntry) => void
  updateEntry:     (id: string, patch: Partial<Omit<AttendanceEntry, 'id'>>) => void
  removeEntry:     (id: string) => void
  exportCSV:       () => void
  dataLoading:     boolean
}

// ─── Hook ─────────────────────────────────────────────────────────────────────
export function useDashboardViewModel(): DashboardViewModel {
  const { attendanceRepo, attendeeRepo, projectRepo } = useContainer()

  const today = new Date().toISOString().slice(0, 10)

  const [filterDate,    setFilterDate]    = useState(today)
  const [filterProject, setFilterProject] = useState('')
  const [filterStatus,  setFilterStatus]  = useState('')
  const [filterMode,    setFilterMode]    = useState('')
  const [search,        setSearch]        = useState('')

  const reset = useCallback(() => {
    setFilterDate(today); setFilterProject(''); setFilterStatus(''); setFilterMode(''); setSearch('')
  }, [today])

  // Derive filtered attendance
  const filtered = useMemo(() => {
    const nameMap = new Map(attendeeRepo.all.map(a => [a.id, a.name.toLowerCase()]))
    return attendanceRepo.all.filter(e => {
      if (filterDate    && e.date         !== filterDate)    return false
      if (filterProject && e.project_id   !== filterProject) return false
      if (filterStatus  && e.status       !== filterStatus)  return false
      if (filterMode    && e.work_mode    !== filterMode)    return false
      if (search) {
        const q = search.toLowerCase()
        if (!(nameMap.get(e.attendee_id) ?? '').includes(q)) return false
      }
      return true
    })
  }, [attendanceRepo.all, attendeeRepo.all, filterDate, filterProject, filterStatus, filterMode, search])

  const presentCount = useMemo(() => filtered.filter(e => e.status === 'present').length, [filtered])
  const lateCount    = useMemo(() => filtered.filter(e => e.status === 'late').length,    [filtered])
  const absentCount  = useMemo(() => filtered.filter(e => e.status === 'absent').length,  [filtered])
  const total        = filtered.length

  const projectAttendance = useMemo(() =>
    projectRepo.all
      .filter(p => p.status === 'active')
      .map(p => {
        const recs = attendanceRepo.all.filter(e => e.project_id === p.id && e.date === filterDate)
        return {
          id:      p.id,
          project: p.name,
          present: recs.filter(e => e.status === 'present').length,
          late:    recs.filter(e => e.status === 'late').length,
          absent:  recs.filter(e => e.status === 'absent').length,
          total:   recs.length,
        }
      }),
    [projectRepo.all, attendanceRepo.all, filterDate]
  )

  const dateLabel = useMemo(() => {
    if (!filterDate) return 'All Dates'
    const d = new Date(filterDate)
    return d.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })
  }, [filterDate])

  const addManualEntry = useCallback((entry: AttendanceEntry) => {
    attendanceRepo.addEntry(entry)
  }, [attendanceRepo])

  const updateEntry = useCallback((id: string, patch: Partial<Omit<AttendanceEntry, 'id'>>) => {
    attendanceRepo.updateEntry(id, patch)
  }, [attendanceRepo])

  const removeEntry = useCallback((id: string) => {
    attendanceRepo.removeEntry(id)
  }, [attendanceRepo])

  const exportCSV = useCallback(() => {
    const rows = filtered.map(entry => ({
      entry,
      attendee: attendeeRepo.all.find(a => a.id === entry.attendee_id),
      project:  projectRepo.all.find(p => p.id === entry.project_id),
    })).sort((a, b) => (a.attendee?.name ?? '').localeCompare(b.attendee?.name ?? ''))
    exporter.execute(attendanceStrategy, rows, filterDate || today, filterDate || today)
  }, [filtered, attendeeRepo.all, projectRepo.all, filterDate, today])

  const dataLoading = !!(projectRepo as any).loading || !!(attendeeRepo as any).loading

  return {
    projects:         projectRepo.all,
    attendees:        attendeeRepo.all,
    filterDate,       setFilterDate,
    filterProject,    setFilterProject,
    filterStatus,     setFilterStatus,
    filterMode,       setFilterMode,
    search,           setSearch,
    reset,
    filtered,         dateLabel,
    presentCount,     lateCount,     absentCount,     total,
    projectAttendance,
    addManualEntry,   updateEntry,   removeEntry,   exportCSV,
    dataLoading,
  }
}
