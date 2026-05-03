// ─── Monthly/Quarterly Reports ViewModel ──────────────────────────────────────
import { useState, useMemo } from 'react'
import { useContainer } from '../../infrastructure/di/RepositoryProvider'
import type { AttendanceEntry, Attendee, Project } from '../../domain/entities'

export type ReportPeriod = 'monthly' | 'quarterly'

export interface MonthlyQuarterlyReportRow {
  period:        string
  total_records: number
  present:       number
  late:          number
  absent:        number
  wfh:           number
  office:        number
  present_pct:   number
  late_pct:      number
  absent_pct:    number
  wfh_pct:       number
  office_pct:    number
  avg_attendance: number
}

export interface AttendeeMonthlyStats {
  attendee_id:   string
  name:          string
  employee_id:   string
  role:          string
  project:       string
  month:         string
  present:       number
  late:          number
  absent:        number
  wfh:           number
  office:        number
  total:         number
}

export interface MonthlyQuarterlyReportsViewModel {
  // State
  reportPeriod:    ReportPeriod;  setReportPeriod:    (v: ReportPeriod) => void
  year:            number;        setYear:            (v: number) => void
  month:           number;        setMonth:           (v: number) => void
  quarter:         number;        setQuarter:         (v: number) => void
  projectFilter:   string;        setProjectFilter:   (v: string) => void
  
  // Data
  projects:        Project[]
  attendees:       Attendee[]
  
  // Derived
  reportData:      MonthlyQuarterlyReportRow[]
  attendeeStats:   AttendeeMonthlyStats[]
  periodLabel:     string
  dataLoading:     boolean
}

export function useMonthlyQuarterlyReportsViewModel(): MonthlyQuarterlyReportsViewModel {
  const { attendanceRepo, projectRepo, attendeeRepo } = useContainer()

  const [reportPeriod,  setReportPeriod]  = useState<ReportPeriod>('monthly')
  const [year,         setYear]          = useState(new Date().getFullYear())
  const [month,        setMonth]         = useState(new Date().getMonth() + 1)
  const [quarter,      setQuarter]       = useState(Math.ceil((new Date().getMonth() + 1) / 3))
  const [projectFilter, setProjectFilter] = useState('')

  // Calculate date range based on period
  const { startDate, endDate } = useMemo(() => {
    if (reportPeriod === 'monthly') {
      const start = new Date(year, month - 1, 1)
      const end = new Date(year, month, 0)
      return {
        startDate: start.toISOString().split('T')[0],
        endDate:   end.toISOString().split('T')[0],
      }
    } else {
      // Quarterly
      const monthStart = (quarter - 1) * 3 + 1
      const start = new Date(year, monthStart - 1, 1)
      const end = new Date(year, monthStart + 2, 0)
      return {
        startDate: start.toISOString().split('T')[0],
        endDate:   end.toISOString().split('T')[0],
      }
    }
  }, [reportPeriod, year, month, quarter])

  // Get period label
  const periodLabel = useMemo(() => {
    if (reportPeriod === 'monthly') {
      const monthName = new Date(year, month - 1).toLocaleString('en-US', { month: 'long' })
      return `${monthName} ${year}`
    } else {
      return `Q${quarter} ${year}`
    }
  }, [reportPeriod, year, month, quarter])

  // Filter attendance records for the period
  const filteredRecords = useMemo(() => {
    return attendanceRepo.all.filter(r => {
      if (r.date < startDate || r.date > endDate) return false
      if (projectFilter && r.project_id !== projectFilter) return false
      return true
    })
  }, [attendanceRepo.all, startDate, endDate, projectFilter])

  // Generate monthly/quarterly summary report
  const reportData = useMemo(() => {
    const buckets = new Map<string, MonthlyQuarterlyReportRow>()

    if (reportPeriod === 'monthly') {
      // Single month - daily breakdown
      const days = new Set<string>()
      filteredRecords.forEach(r => days.add(r.date))

      Array.from(days).sort().forEach(date => {
        const dayRecords = filteredRecords.filter(r => r.date === date)
        const total = dayRecords.length
        if (total === 0) return

        const present = dayRecords.filter(r => r.status === 'present').length
        const late = dayRecords.filter(r => r.status === 'late').length
        const absent = dayRecords.filter(r => r.status === 'absent').length
        const wfh = dayRecords.filter(r => r.work_mode === 'wfh').length
        const office = dayRecords.filter(r => r.work_mode === 'office').length

        const row: MonthlyQuarterlyReportRow = {
          period: date,
          total_records: total,
          present,
          late,
          absent,
          wfh,
          office,
          present_pct: Math.round((present / total) * 100),
          late_pct: Math.round((late / total) * 100),
          absent_pct: Math.round((absent / total) * 100),
          wfh_pct: Math.round((wfh / total) * 100),
          office_pct: Math.round((office / total) * 100),
          avg_attendance: Math.round(((present + late) / total) * 100),
        }
        buckets.set(date, row)
      })
    } else {
      // Quarterly - monthly breakdown
      for (let m = 0; m < 3; m++) {
        const monthNum = (quarter - 1) * 3 + m + 1
        const monthStart = new Date(year, monthNum - 1, 1).toISOString().split('T')[0]
        const monthEnd = new Date(year, monthNum, 0).toISOString().split('T')[0]

        const monthRecords = filteredRecords.filter(r => r.date >= monthStart && r.date <= monthEnd)
        if (monthRecords.length === 0) continue

        const total = monthRecords.length
        const present = monthRecords.filter(r => r.status === 'present').length
        const late = monthRecords.filter(r => r.status === 'late').length
        const absent = monthRecords.filter(r => r.status === 'absent').length
        const wfh = monthRecords.filter(r => r.work_mode === 'wfh').length
        const office = monthRecords.filter(r => r.work_mode === 'office').length

        const monthName = new Date(year, monthNum - 1).toLocaleString('en-US', { month: 'short' })
        const periodStr = `${monthName} ${year}`

        const row: MonthlyQuarterlyReportRow = {
          period: periodStr,
          total_records: total,
          present,
          late,
          absent,
          wfh,
          office,
          present_pct: Math.round((present / total) * 100),
          late_pct: Math.round((late / total) * 100),
          absent_pct: Math.round((absent / total) * 100),
          wfh_pct: Math.round((wfh / total) * 100),
          office_pct: Math.round((office / total) * 100),
          avg_attendance: Math.round(((present + late) / total) * 100),
        }
        buckets.set(periodStr, row)
      }
    }

    return Array.from(buckets.values())
  }, [reportPeriod, filteredRecords, year, quarter])

  // Generate attendee-level statistics
  const attendeeStats = useMemo(() => {
    const statsMap = new Map<string, AttendeeMonthlyStats>()

    if (reportPeriod === 'monthly') {
      filteredRecords.forEach(record => {
        const key = `${record.attendee_id}-${month}`
        let stat = statsMap.get(key)

        if (!stat) {
          const attendee = attendeeRepo.all.find(a => a.id === record.attendee_id)
          stat = {
            attendee_id: record.attendee_id,
            name: attendee?.name ?? 'Unknown',
            employee_id: attendee?.employee_id ?? '',
            role: attendee?.role ?? '',
            project: attendee?.project ?? '',
            month: new Date(year, month - 1).toLocaleString('en-US', { month: 'long', year: 'numeric' }),
            present: 0,
            late: 0,
            absent: 0,
            wfh: 0,
            office: 0,
            total: 0,
          }
        }

        stat.total++
        if (record.status === 'present') stat.present++
        else if (record.status === 'late') stat.late++
        else stat.absent++

        if (record.work_mode === 'wfh') stat.wfh++
        else if (record.work_mode === 'office') stat.office++

        statsMap.set(key, stat)
      })
    } else {
      // Quarterly
      filteredRecords.forEach(record => {
        const recordMonth = parseInt(record.date.split('-')[1])
        const key = `${record.attendee_id}-Q${quarter}-M${recordMonth}`
        let stat = statsMap.get(key)

        if (!stat) {
          const attendee = attendeeRepo.all.find(a => a.id === record.attendee_id)
          const monthName = new Date(year, recordMonth - 1).toLocaleString('en-US', { month: 'long', year: 'numeric' })
          stat = {
            attendee_id: record.attendee_id,
            name: attendee?.name ?? 'Unknown',
            employee_id: attendee?.employee_id ?? '',
            role: attendee?.role ?? '',
            project: attendee?.project ?? '',
            month: monthName,
            present: 0,
            late: 0,
            absent: 0,
            wfh: 0,
            office: 0,
            total: 0,
          }
        }

        stat.total++
        if (record.status === 'present') stat.present++
        else if (record.status === 'late') stat.late++
        else stat.absent++

        if (record.work_mode === 'wfh') stat.wfh++
        else if (record.work_mode === 'office') stat.office++

        statsMap.set(key, stat)
      })
    }

    return Array.from(statsMap.values()).sort((a, b) => a.name.localeCompare(b.name))
  }, [reportPeriod, filteredRecords, year, month, quarter, attendeeRepo.all])

  return {
    reportPeriod, setReportPeriod,
    year, setYear,
    month, setMonth,
    quarter, setQuarter,
    projectFilter, setProjectFilter,
    projects: projectRepo.all,
    attendees: attendeeRepo.all,
    reportData,
    attendeeStats,
    periodLabel,
    dataLoading: false,
  }
}
