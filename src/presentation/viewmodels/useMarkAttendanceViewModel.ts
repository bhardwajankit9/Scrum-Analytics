// ─── Mark Attendance ViewModel ────────────────────────────────────────────────
import { useState, useMemo, useCallback } from 'react'
import { useContainer } from '../../infrastructure/di/RepositoryProvider'
import { SaveAttendanceUseCase } from '../../domain/usecases'
import type { Attendee, AttendanceEntry, Holiday, Leave, Project } from '../../domain/entities'

// ── Row type for the attendance sheet ─────────────────────────────────────────
export interface AttendanceRow {
  attendeeId:  string
  name:        string
  employeeId:  string
  role:        string
  joinTime:    string
  status:      'present' | 'late' | 'absent'
  minutesLate: number
  workMode:    'office' | 'wfh' | ''
  notes:       string
  onLeave:     boolean
}

// ── ViewModel interface ────────────────────────────────────────────────────────
export interface MarkAttendanceViewModel {
  step:            1 | 2
  setStep:         (s: 1 | 2) => void
  selectedProject: string;  setSelectedProject: (v: string) => void
  selectedDate:    string;  setSelectedDate:    (v: string) => void
  rows:            AttendanceRow[]
  isSaved:         boolean
  savedAt:         string
  canSave:         boolean
  holidayForDate:  Holiday | undefined
  isOnLeave:       (attendeeId: string) => boolean
  projects:        Project[]
  attendees:       Attendee[]
  loadAttendees:   () => void
  updateRow:       (attendeeId: string, patch: Partial<AttendanceRow>) => void
  markAll:         (status: 'present' | 'absent') => void
  setBulkWorkMode: (mode: 'office' | 'wfh') => void
  saveAttendance:  () => void
  resetSession:    () => void
}

// ─── Lightweight data accessor for MarkAttendanceScreen ─────────────────────
// Provides the same API surface the screen expects from useApp(), while wiring
// through the DI container (IXxxRepository abstractions).
export function useMarkAttendanceData() {
  const { projectRepo, attendeeRepo, attendanceRepo, holidayRepo, leaveRepo, dataLoading } = useContainer()
  const saveUC = useMemo(() => new SaveAttendanceUseCase(attendanceRepo), [attendanceRepo])
  return {
    projects:            projectRepo.all,
    attendees:           attendeeRepo.all,
    holidays:            holidayRepo.all,
    leaves:              leaveRepo.all,
    dataLoading,
    getAttendanceForDate:(pid: string, date: string) => attendanceRepo.getByProjectAndDate(pid, date),
    saveAttendance:      (entries: AttendanceEntry[]) => saveUC.execute(entries),
  }
}
function computeLate(
  joinTime: string,
  scrumTime: string,
  graceMins: number
): { status: 'present' | 'late'; minutesLate: number } {
  const [jh, jm] = joinTime.split(':').map(Number)
  const [sh, sm] = scrumTime.split(':').map(Number)
  const diff = (jh * 60 + jm) - (sh * 60 + sm)
  if (diff <= graceMins) return { status: 'present', minutesLate: 0 }
  return { status: 'late', minutesLate: diff }
}

export function useMarkAttendanceViewModel(): MarkAttendanceViewModel {
  const { projectRepo, attendeeRepo, attendanceRepo, holidayRepo, leaveRepo } = useContainer()

  const today = new Date().toISOString().slice(0, 10)

  const [step,            setStep]            = useState<1 | 2>(1)
  const [selectedProject, setSelectedProject] = useState('')
  const [selectedDate,    setSelectedDate]    = useState(today)
  const [rows,            setRows]            = useState<AttendanceRow[]>([])
  const [isSaved,         setIsSaved]         = useState(false)
  const [savedAt,         setSavedAt]         = useState('')

  const saveUC = useMemo(() => new SaveAttendanceUseCase(attendanceRepo), [attendanceRepo])

  const project         = useMemo(() => projectRepo.all.find(p => p.id === selectedProject),          [projectRepo.all, selectedProject])
  const holidayForDate  = useMemo(() => holidayRepo.all.find(h => h.project_id === selectedProject && h.holiday_date === selectedDate), [holidayRepo.all, selectedProject, selectedDate])
  const isOnLeave       = useCallback((attendeeId: string) =>
    leaveRepo.all.some(l =>
      l.attendee_id === attendeeId &&
      l.project_id  === selectedProject &&
      selectedDate  >= l.start_date &&
      selectedDate  <= l.end_date
    ), [leaveRepo.all, selectedProject, selectedDate])
  const canSave = rows.length > 0 && !isSaved

  // Load attendees into rows when user clicks "Next" on step 1
  const loadAttendees = useCallback(() => {
    if (!selectedProject) return
    const projectAttendees = attendeeRepo.all.filter(a => {
      const proj = projectRepo.all.find(p => p.id === selectedProject)
      return proj && a.project === proj.name && a.status !== 'inactive'
    })
    // Pre-fill from existing records for the date
    const existing = attendanceRepo.getByProjectAndDate(selectedProject, selectedDate)
    const newRows: AttendanceRow[] = projectAttendees.map(a => {
      const ex = existing.find(e => e.attendee_id === a.id)
      if (ex) {
        return {
          attendeeId:  a.id,
          name:        a.name,
          employeeId:  a.employee_id,
          role:        a.role,
          joinTime:    ex.join_time ?? '',
          status:      ex.status,
          minutesLate: ex.minutes_late,
          workMode:    (ex.work_mode ?? '') as 'office' | 'wfh' | '',
          notes:       ex.notes,
          onLeave:     isOnLeave(a.id),
        }
      }
      return {
        attendeeId:  a.id,
        name:        a.name,
        employeeId:  a.employee_id,
        role:        a.role,
        joinTime:    '',
        status:      isOnLeave(a.id) ? 'absent' : 'absent',
        minutesLate: 0,
        workMode:    '',
        notes:       isOnLeave(a.id) ? 'On approved leave' : '',
        onLeave:     isOnLeave(a.id),
      }
    })
    setRows(newRows)
    setIsSaved(false)
    setStep(2)
  }, [selectedProject, selectedDate, attendeeRepo.all, projectRepo.all, attendanceRepo, isOnLeave])

  const updateRow = useCallback((attendeeId: string, patch: Partial<AttendanceRow>) => {
    setRows(prev => prev.map(r => {
      if (r.attendeeId !== attendeeId) return r
      const updated = { ...r, ...patch }
      // Auto-compute late status when joinTime changes
      if (patch.joinTime !== undefined && patch.joinTime && project) {
        const { status, minutesLate } = computeLate(
          patch.joinTime, project.scrum_time, project.late_grace_minutes
        )
        updated.status      = status
        updated.minutesLate = minutesLate
      }
      if (patch.status === 'absent') { updated.joinTime = ''; updated.minutesLate = 0 }
      return updated
    }))
  }, [project])

  const markAll = useCallback((status: 'present' | 'absent') => {
    setRows(prev => prev.map(r => ({
      ...r,
      status,
      joinTime:    status === 'absent' ? '' : r.joinTime,
      minutesLate: status === 'absent' ? 0 : r.minutesLate,
    })))
  }, [])

  const setBulkWorkMode = useCallback((mode: 'office' | 'wfh') => {
    setRows(prev => prev.map(r => ({ ...r, workMode: mode })))
  }, [])

  const saveAttendance = useCallback(() => {
    if (!selectedProject) return
    const now = new Date().toISOString()
    const entries: AttendanceEntry[] = rows.map(r => ({
      id:          '',   // let Supabase generate UUID on insert; upsert key is project_id+attendee_id+date
      project_id:  selectedProject,
      attendee_id: r.attendeeId,
      date:        selectedDate,
      join_time:   r.joinTime || null,
      status:      r.status,
      minutes_late:r.minutesLate,
      work_mode:   r.workMode as 'office' | 'wfh' | null || null,
      notes:       r.notes,
      marked_by:   'Admin User',
      marked_at:   now,
    }))
    saveUC.execute(entries)
    setIsSaved(true)
    setSavedAt(new Date().toLocaleTimeString())
  }, [rows, selectedProject, selectedDate, saveUC])

  const resetSession = useCallback(() => {
    setStep(1); setRows([]); setIsSaved(false); setSavedAt(''); setSelectedProject('')
  }, [])

  return {
    step, setStep, selectedProject, setSelectedProject, selectedDate, setSelectedDate,
    rows, isSaved, savedAt, canSave, holidayForDate, isOnLeave,
    projects: projectRepo.all, attendees: attendeeRepo.all,
    loadAttendees, updateRow, markAll, setBulkWorkMode, saveAttendance, resetSession,
  }
}
