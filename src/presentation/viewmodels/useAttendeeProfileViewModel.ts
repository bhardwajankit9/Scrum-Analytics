// ─── Attendee Profile ViewModel ───────────────────────────────────────────────
import { useMemo, useCallback } from 'react'
import { useContainer } from '../../infrastructure/di/RepositoryProvider'
import { ExportCSVUseCase } from '../../domain/usecases'
import type { Attendee, AttendanceEntry, Leave, Project } from '../../domain/entities'

type Row = Record<string, string | number>
const historyStrategy = {
  format: (rows: unknown[]): Row[] =>
    (rows as AttendanceEntry[]).map(e => ({
      Date:           e.date,
      Status:         e.status,
      'Join Time':    e.join_time ?? '—',
      'Work Mode':    e.work_mode ?? '—',
      'Minutes Late': e.minutes_late,
      Notes:          e.notes,
    })),
  filename: (f: string, t: string) => `attendance_history_${f}_${t}.csv`,
}
const exporter = new ExportCSVUseCase()

export interface AttendeeProfileViewModel {
  attendee:    Attendee | undefined
  project:     Project  | undefined
  projects:    Project[]
  history:     AttendanceEntry[]
  leaves:      Leave[]
  stats: {
    total: number; present: number; late: number; absent: number
    attendanceRate: number; lateRate: number; avgLate: number; wfhRate: number
    currentStreak: number
  }
  monthlyChartData: { month: string; present: number; late: number; absent: number }[]
  workModeHeatmapData: Map<string, { work_mode: string | null; status: string }>
  updateAttendee: (attendeeId: string, partial: Partial<Omit<Attendee, 'id'>>) => Attendee | undefined
  exportCSV:      () => void
}

export function useAttendeeProfileViewModel(id: string | undefined): AttendeeProfileViewModel {
  const { attendeeRepo, attendanceRepo, leaveRepo, projectRepo } = useContainer()

  const attendee = useMemo(() => attendeeRepo.all.find(a => a.id === id), [attendeeRepo.all, id])
  const project  = useMemo(
    () => projectRepo.all.find(p => p.name === attendee?.project),
    [projectRepo.all, attendee]
  )

  const history = useMemo(
    () => id ? attendanceRepo.getByAttendee(id).sort((a, b) => b.date.localeCompare(a.date)) : [],
    [attendanceRepo, id]
  )
  const leaves = useMemo(
    () => id ? leaveRepo.getByAttendee(id) : [],
    [leaveRepo, id]
  )

  const stats = useMemo(() => {
    const total   = history.length
    const present = history.filter(e => e.status === 'present').length
    const late    = history.filter(e => e.status === 'late').length
    const absent  = history.filter(e => e.status === 'absent').length
    const attended = present + late
    const wfh = history.filter(e => e.work_mode === 'wfh').length
    const lateEntries = history.filter(e => e.minutes_late > 0)
    const avgLate = lateEntries.length
      ? Math.round(lateEntries.reduce((s, e) => s + e.minutes_late, 0) / lateEntries.length)
      : 0
    // rolling streak
    let streak = 0
    const sorted = [...history].sort((a, b) => b.date.localeCompare(a.date))
    for (const e of sorted) {
      if (e.status === 'present' || e.status === 'late') streak++
      else break
    }
    return {
      total,
      present,
      late,
      absent,
      attendanceRate: total ? Math.round(((present + late) / total) * 100) : 0,
      lateRate:       total ? Math.round((late / total) * 100) : 0,
      avgLate,
      wfhRate:        attended > 0 ? Math.round((wfh / attended) * 100) : 0,
      currentStreak:  streak,
    }
  }, [history])

  const monthlyChartData = useMemo(() => {
    const buckets = new Map<string, { present: number; late: number; absent: number }>()
    history.forEach(e => {
      const key = e.date.slice(0, 7) // YYYY-MM
      const b = buckets.get(key) ?? { present: 0, late: 0, absent: 0 }
      b[e.status as 'present' | 'late' | 'absent']++
      buckets.set(key, b)
    })
    return Array.from(buckets.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-6)
      .map(([month, v]) => ({ month, ...v }))
  }, [history])

  const workModeHeatmapData = useMemo(() => {
    const map = new Map<string, { work_mode: string | null; status: string }>()
    history.forEach(e => {
      map.set(e.date, { work_mode: e.work_mode ?? null, status: e.status })
    })
    return map
  }, [history])

  const updateAttendee = useCallback(
    (attendeeId: string, partial: Partial<Omit<Attendee, 'id'>>) => {
      return attendeeRepo.update(attendeeId, partial)
    },
    [attendeeRepo]
  )

  const exportCSV = useCallback(() => {
    const today = new Date().toISOString().slice(0, 10)
    exporter.execute(historyStrategy, history, history[history.length - 1]?.date ?? today, today)
  }, [history])

  return { attendee, project, projects: projectRepo.all, history, leaves, stats, monthlyChartData, workModeHeatmapData, updateAttendee, exportCSV }
}
