// ─── Reports ViewModel ────────────────────────────────────────────────────────
import { useState, useMemo, useCallback } from 'react'
import { useContainer } from '../../infrastructure/di/RepositoryProvider'
import { ExportCSVUseCase } from '../../domain/usecases'
import type { Attendee, AttendanceEntry, Project, DailyReportRow } from '../../domain/entities'

// ─── Lightweight data accessor for DetailedReportsScreen ─────────────────────
// Provides raw data arrays; the screen manages its own complex computed state.
export function useReportsData() {
  const { attendanceRepo, attendeeRepo, projectRepo } = useContainer()
  const dataLoading = !!(projectRepo as any).loading || !!(attendeeRepo as any).loading
  return {
    attendanceRecords: attendanceRepo.all,
    attendees:         attendeeRepo.all,
    projects:          projectRepo.all,
    dataLoading,
  }
}

type ReportType = 'daily_summary' | 'late_report' | 'absent_report' | 'wfh_report'
type Row = Record<string, string | number>

const exporter = new ExportCSVUseCase()

const csvStrategies: Record<ReportType, { format(rows: unknown[]): Row[]; filename(f: string, t: string): string }> = {
  daily_summary: {
    format: (rows: unknown[]) => (rows as DailyReportRow[]).map(r => ({
      Date: r.date, Day: r.day, Total: r.total, Present: r.present,
      Late: r.late, Absent: r.absent, 'Rate %': r.rate,
    })),
    filename: (f, t) => `daily_summary_${f}_${t}.csv`,
  },
  late_report: {
    format: (rows: unknown[]) => (rows as Array<{ entry: AttendanceEntry; attendee?: Attendee; project?: Project }>).map(({ entry, attendee, project }) => ({
      Date: entry.date, Name: attendee?.name ?? entry.attendee_id,
      Project: project?.name ?? entry.project_id,
      'Minutes Late': entry.minutes_late, 'Join Time': entry.join_time ?? '—',
      'Work Mode': entry.work_mode ?? '—',
    })),
    filename: (f, t) => `late_report_${f}_${t}.csv`,
  },
  absent_report: {
    format: (rows: unknown[]) => (rows as Array<{ entry: AttendanceEntry; attendee?: Attendee; project?: Project }>).map(({ entry, attendee, project }) => ({
      Date: entry.date, Name: attendee?.name ?? entry.attendee_id,
      Project: project?.name ?? entry.project_id, Notes: entry.notes,
    })),
    filename: (f, t) => `absent_report_${f}_${t}.csv`,
  },
  wfh_report: {
    format: (rows: unknown[]) => (rows as Array<{ entry: AttendanceEntry; attendee?: Attendee; project?: Project }>).map(({ entry, attendee, project }) => ({
      Date: entry.date, Name: attendee?.name ?? entry.attendee_id,
      Project: project?.name ?? entry.project_id, Status: entry.status,
    })),
    filename: (f, t) => `wfh_report_${f}_${t}.csv`,
  },
}

export interface ReportsViewModel {
  reportType:    ReportType;  setReportType:    (v: ReportType) => void
  filterProject: string;      setFilterProject: (v: string) => void
  filterAttendee:string;      setFilterAttendee:(v: string) => void
  fromDate:      string;      setFromDate:      (v: string) => void
  toDate:        string;      setToDate:        (v: string) => void
  projects:      Project[]
  attendees:     Attendee[]
  dailyRows:     DailyReportRow[]
  lateRows:      Array<{ entry: AttendanceEntry; attendee?: Attendee; project?: Project }>
  absentRows:    Array<{ entry: AttendanceEntry; attendee?: Attendee; project?: Project }>
  wfhRows:       Array<{ entry: AttendanceEntry; attendee?: Attendee; project?: Project }>
  chartData:     { date: string; present: number; late: number; absent: number }[]
  summary:       { present: number; late: number; absent: number; rate: number }
  exportCSV:     () => void
}

export function useReportsViewModel(): ReportsViewModel {
  const { attendanceRepo, attendeeRepo, projectRepo } = useContainer()

  const endDef   = new Date().toISOString().slice(0, 10)
  const startDef = new Date(Date.now() - 29 * 86400000).toISOString().slice(0, 10)

  const [reportType,    setReportType]    = useState<ReportType>('daily_summary')
  const [filterProject, setFilterProject] = useState('')
  const [filterAttendee,setFilterAttendee]= useState('')
  const [fromDate,      setFromDate]      = useState(startDef)
  const [toDate,        setToDate]        = useState(endDef)

  // Base filtered records
  const base = useMemo(() =>
    attendanceRepo.all.filter(e => {
      if (filterProject  && e.project_id   !== filterProject)  return false
      if (filterAttendee && e.attendee_id  !== filterAttendee) return false
      if (fromDate       && e.date         <  fromDate)        return false
      if (toDate         && e.date         >  toDate)          return false
      return true
    }),
    [attendanceRepo.all, filterProject, filterAttendee, fromDate, toDate]
  )

  const enriched = useMemo(() =>
    base.map(entry => ({
      entry,
      attendee: attendeeRepo.all.find(a => a.id === entry.attendee_id),
      project:  projectRepo.all.find(p => p.id === entry.project_id),
    })),
    [base, attendeeRepo.all, projectRepo.all]
  )

  const dailyRows = useMemo<DailyReportRow[]>(() => {
    const buckets = new Map<string, DailyReportRow>()
    base.forEach(e => {
      const existing = buckets.get(e.date)
      const day = new Date(e.date).toLocaleDateString('en-US', { weekday: 'short' })
      const row: DailyReportRow = existing ?? { date: e.date, day, total: 0, present: 0, late: 0, absent: 0, rate: 0 }
      row.total++
      if (e.status === 'present') row.present++
      else if (e.status === 'late') row.late++
      else row.absent++
      row.rate = Math.round(((row.present + row.late) / row.total) * 100)
      buckets.set(e.date, row)
    })
    return Array.from(buckets.values()).sort((a, b) => b.date.localeCompare(a.date))
  }, [base])

  const lateRows   = useMemo(() => enriched.filter(r => r.entry.status === 'late'),    [enriched])
  const absentRows = useMemo(() => enriched.filter(r => r.entry.status === 'absent'),  [enriched])
  const wfhRows    = useMemo(() => enriched.filter(r => r.entry.work_mode === 'wfh'),  [enriched])

  const chartData = useMemo(() => {
    const sorted = [...dailyRows].sort((a, b) => a.date.localeCompare(b.date)).slice(-14)
    return sorted.map(r => ({ date: r.date, present: r.present, late: r.late, absent: r.absent }))
  }, [dailyRows])

  const summary = useMemo(() => {
    const t = base.length
    const p = base.filter(e => e.status === 'present').length
    const l = base.filter(e => e.status === 'late').length
    const a = base.filter(e => e.status === 'absent').length
    return { present: p, late: l, absent: a, rate: t ? Math.round(((p + l) / t) * 100) : 0 }
  }, [base])

  const exportCSV = useCallback(() => {
    const strategy = csvStrategies[reportType]
    const data = reportType === 'daily_summary' ? dailyRows
      : reportType === 'late_report'   ? lateRows
      : reportType === 'absent_report' ? absentRows
      : wfhRows
    exporter.execute(strategy, data, fromDate, toDate)
  }, [reportType, dailyRows, lateRows, absentRows, wfhRows, fromDate, toDate])

  return {
    reportType, setReportType, filterProject, setFilterProject,
    filterAttendee, setFilterAttendee, fromDate, setFromDate, toDate, setToDate,
    projects: projectRepo.all, attendees: attendeeRepo.all,
    dailyRows, lateRows, absentRows, wfhRows, chartData, summary, exportCSV,
  }
}
