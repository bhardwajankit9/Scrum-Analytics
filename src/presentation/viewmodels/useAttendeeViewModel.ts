// ─── Attendee Directory ViewModel ─────────────────────────────────────────────
import { useState, useMemo, useCallback } from 'react'
import { useContainer } from '../../infrastructure/di/RepositoryProvider'
import { ExportCSVUseCase } from '../../domain/usecases'
import type { Attendee, Project } from '../../domain/entities'

type AttendeeRow = Record<string, string | number>
const attendeeCSVStrategy = {
  format: (rows: unknown[]): AttendeeRow[] =>
    (rows as Attendee[]).map(a => ({
      'Employee ID': a.employee_id,
      Name:          a.name,
      Email:         a.email,
      Role:          a.role,
      Project:       a.project,
      Manager:       a.manager,
      Status:        a.status,
    })),
  filename: (_f: string, _t: string) => 'attendees.csv',
}
const exporter = new ExportCSVUseCase()

export interface AttendeeViewModel {
  attendees:    Attendee[]
  projects:     Project[]
  filtered:     Attendee[]
  search:       string;  setSearch:       (v: string) => void
  roleFilter:   string;  setRoleFilter:   (v: string) => void
  statusFilter: string;  setStatusFilter: (v: string) => void
  projectFilter:string;  setProjectFilter:(v: string) => void
  stats: { total: number; active: number; onLeave: number; inactive: number; projectCount: number }
  addAttendee:    (a: Omit<Attendee, 'id'>) => Attendee
  updateAttendee: (id: string, partial: Partial<Omit<Attendee, 'id'>>) => Attendee
  deleteAttendee: (id: string) => void
  exportCSV:      () => void
  dataLoading:    boolean
}

export function useAttendeeViewModel(): AttendeeViewModel {
  const { attendeeRepo, projectRepo } = useContainer()

  const [search,        setSearch]        = useState('')
  const [roleFilter,    setRoleFilter]    = useState('')
  const [statusFilter,  setStatusFilter]  = useState('')
  const [projectFilter, setProjectFilter] = useState('')

  const filtered = useMemo(() => {
    const q = search.toLowerCase()
    return attendeeRepo.all.filter(a => {
      if (roleFilter    && a.role    !== roleFilter)    return false
      if (statusFilter  && a.status  !== statusFilter)  return false
      if (projectFilter && a.project !== projectFilter) return false
      if (q && !a.name.toLowerCase().includes(q) && !a.email.toLowerCase().includes(q) && !a.employee_id.toLowerCase().includes(q)) return false
      return true
    })
  }, [attendeeRepo.all, search, roleFilter, statusFilter, projectFilter])

  const stats = useMemo(() => ({
    total:        attendeeRepo.all.length,
    active:       attendeeRepo.all.filter(a => a.status === 'active').length,
    onLeave:      attendeeRepo.all.filter(a => a.status === 'on_leave').length,
    inactive:     attendeeRepo.all.filter(a => a.status === 'inactive').length,
    projectCount: new Set(attendeeRepo.all.map(a => a.project)).size,
  }), [attendeeRepo.all])

  const addAttendee    = useCallback((a: Omit<Attendee, 'id'>) => attendeeRepo.add(a),              [attendeeRepo])
  const updateAttendee = useCallback((id: string, p: Partial<Omit<Attendee, 'id'>>) => attendeeRepo.update(id, p), [attendeeRepo])
  const deleteAttendee = useCallback((id: string) => attendeeRepo.remove(id),                       [attendeeRepo])

  const exportCSV = useCallback(() => {
    const today = new Date().toISOString().slice(0, 10)
    exporter.execute(attendeeCSVStrategy, filtered, today, today)
  }, [filtered])

  const dataLoading = !!(projectRepo as any).loading || !!(attendeeRepo as any).loading

  return {
    attendees: attendeeRepo.all, projects: projectRepo.all,
    filtered, search, setSearch, roleFilter, setRoleFilter,
    statusFilter, setStatusFilter, projectFilter, setProjectFilter,
    stats, addAttendee, updateAttendee, deleteAttendee, exportCSV,
    dataLoading,
  }
}
