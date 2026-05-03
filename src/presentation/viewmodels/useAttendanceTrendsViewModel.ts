import { useState, useMemo, useCallback } from 'react'
import { useContainer } from '../../infrastructure/di/RepositoryProvider'
import type { Attendee, AttendanceEntry, Project } from '../../domain/entities'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface TrendDataPoint {
  date: string
  dayName: string
  attendancePercent: number
  present: number
  late: number
  absent: number
  total: number
}

export interface DayOfWeekTrend {
  day: string
  dayCode: 'Mon' | 'Tue' | 'Wed' | 'Thu' | 'Fri' | 'Sat' | 'Sun'
  avgAttendance: number
  avgAbsent: number
  avgLate: number
  total: number
}

export interface AttendeeConsistency {
  attendee_id: string
  attendeeName: string
  totalDays: number
  presentDays: number
  lateDays: number
  absentDays: number
  consistencyScore: number // 0-100, higher is better
  attendancePercent: number
}

export interface AttendanceTrendsData {
  trendData: TrendDataPoint[]
  dayOfWeekTrends: DayOfWeekTrend[]
  consistencyMetrics: AttendeeConsistency[]
  summary: {
    avgAttendance: number
    bestDay: DayOfWeekTrend | null
    worstDay: DayOfWeekTrend | null
    mostConsistent: AttendeeConsistency | null
    leastConsistent: AttendeeConsistency | null
  }
}

// ─── ViewModel ────────────────────────────────────────────────────────────────

export function useAttendanceTrendsViewModel() {
  const { attendanceRepo, attendeeRepo, projectRepo, holidayRepo } = useContainer()

  const today = new Date().toISOString().slice(0, 10)
  const oneMonthAgo = new Date(Date.now() - 29 * 86400000).toISOString().slice(0, 10)

  const [periodType, setPeriodType] = useState<'weekly' | 'monthly'>('monthly')
  const [projectId, setProjectId] = useState('')
  const [fromDate, setFromDate] = useState(oneMonthAgo)
  const [toDate, setToDate] = useState(today)

  // Helper: Check if date is a weekend (Saturday=6, Sunday=0)
  const isWeekend = useCallback((dateStr: string): boolean => {
    const dayOfWeek = new Date(dateStr + 'T00:00').getDay()
    return dayOfWeek === 0 || dayOfWeek === 6
  }, [])

  // Helper: Check if date is a public holiday
  const isPublicHoliday = useCallback((dateStr: string): boolean => {
    return !!holidayRepo.all.find(h => h.holiday_date === dateStr)
  }, [holidayRepo.all])

  // Helper: Check if date is a working day (not weekend, not holiday)
  const isWorkingDay = useCallback((dateStr: string): boolean => {
    return !isWeekend(dateStr) && !isPublicHoliday(dateStr)
  }, [isWeekend, isPublicHoliday])

  // Get all records within date range, excluding weekends and holidays
  const filteredRecords = useMemo(() => {
    return attendanceRepo.all.filter(
      r => r.date >= fromDate && r.date <= toDate && (!projectId || r.project_id === projectId) && isWorkingDay(r.date)
    )
  }, [attendanceRepo.all, fromDate, toDate, projectId, isWorkingDay])

  // Calculate trend data (daily aggregation)
  const trendData = useMemo((): TrendDataPoint[] => {
    const dateMap = new Map<string, { present: number; late: number; absent: number; total: number }>()

    filteredRecords.forEach(record => {
      if (!dateMap.has(record.date)) {
        dateMap.set(record.date, { present: 0, late: 0, absent: 0, total: 0 })
      }
      const entry = dateMap.get(record.date)!
      entry.total++
      if (record.status === 'present') entry.present++
      else if (record.status === 'late') entry.late++
      else entry.absent++
    })

    return Array.from(dateMap.entries())
      .map(([date, data]) => ({
        date,
        dayName: new Date(date + 'T00:00').toLocaleDateString('en-US', { weekday: 'short' }),
        attendancePercent: Math.round(((data.present + data.late) / data.total) * 100),
        present: data.present,
        late: data.late,
        absent: data.absent,
        total: data.total,
      }))
      .sort((a, b) => a.date.localeCompare(b.date))
  }, [filteredRecords])

  // Calculate day-of-week trends (Mon-Fri only, excluding holidays)
  const dayOfWeekTrends = useMemo((): DayOfWeekTrend[] => {
    const dayMap = new Map<string, { present: number; late: number; absent: number; total: number; count: number }>()
    const dayNames: Record<number, DayOfWeekTrend['dayCode']> = {
      0: 'Sun',
      1: 'Mon',
      2: 'Tue',
      3: 'Wed',
      4: 'Thu',
      5: 'Fri',
      6: 'Sat',
    }

    filteredRecords.forEach(record => {
      const dayOfWeek = new Date(record.date + 'T00:00').getDay()
      const dayCode = dayNames[dayOfWeek]
      if (!dayMap.has(dayCode)) {
        dayMap.set(dayCode, { present: 0, late: 0, absent: 0, total: 0, count: 0 })
      }
      const entry = dayMap.get(dayCode)!
      entry.total++
      entry.count++
      if (record.status === 'present') entry.present++
      else if (record.status === 'late') entry.late++
      else entry.absent++
    })

    // Only include Mon-Fri (weekdays), exclude Sat-Sun
    return ['Mon', 'Tue', 'Wed', 'Thu', 'Fri']
      .map(dayCode => {
        const data = dayMap.get(dayCode as DayOfWeekTrend['dayCode']) || { present: 0, late: 0, absent: 0, total: 0, count: 0 }
        return {
          day: dayCode,
          dayCode: dayCode as DayOfWeekTrend['dayCode'],
          avgAttendance: data.total > 0 ? Math.round(((data.present + data.late) / data.total) * 100) : 0,
          avgAbsent: data.count > 0 ? Math.round(data.absent / data.count) : 0,
          avgLate: data.count > 0 ? Math.round(data.late / data.count) : 0,
          total: data.total,
        }
      })
  }, [filteredRecords])

  // Calculate consistency metrics per attendee
  const consistencyMetrics = useMemo((): AttendeeConsistency[] => {
    const attendeeMap = new Map<string, { present: number; late: number; absent: number; total: number }>()

    filteredRecords.forEach(record => {
      if (!attendeeMap.has(record.attendee_id)) {
        attendeeMap.set(record.attendee_id, { present: 0, late: 0, absent: 0, total: 0 })
      }
      const entry = attendeeMap.get(record.attendee_id)!
      entry.total++
      if (record.status === 'present') entry.present++
      else if (record.status === 'late') entry.late++
      else entry.absent++
    })

    return Array.from(attendeeMap.entries())
      .map(([attendeeId, data]) => {
        const attendee = attendeeRepo.all.find(a => a.id === attendeeId)
        const attendancePercent = data.total > 0 ? Math.round(((data.present + data.late) / data.total) * 100) : 0
        // Consistency: Based on attendance percentage
        // 100% present = 100 score
        // 0% present = 0 score
        const consistencyScore = attendancePercent
        return {
          attendee_id: attendeeId,
          attendeeName: attendee?.name || 'Unknown',
          totalDays: data.total,
          presentDays: data.present,
          lateDays: data.late,
          absentDays: data.absent,
          consistencyScore,
          attendancePercent,
        }
      })
      .sort((a, b) => b.consistencyScore - a.consistencyScore)
  }, [filteredRecords, attendeeRepo.all])

  // Calculate summary insights
  const summary = useMemo(() => {
    const avgAttendance = trendData.length > 0 ? Math.round(trendData.reduce((sum, d) => sum + d.attendancePercent, 0) / trendData.length) : 0
    const bestDay = dayOfWeekTrends.length > 0 ? dayOfWeekTrends.reduce((best, d) => (d.avgAttendance > best.avgAttendance ? d : best)) : null
    const worstDay = dayOfWeekTrends.length > 0 ? dayOfWeekTrends.reduce((worst, d) => (d.avgAttendance < worst.avgAttendance ? d : worst)) : null
    const mostConsistent = consistencyMetrics.length > 0 ? consistencyMetrics[0] : null
    const leastConsistent = consistencyMetrics.length > 0 ? consistencyMetrics[consistencyMetrics.length - 1] : null

    return { avgAttendance, bestDay, worstDay, mostConsistent, leastConsistent }
  }, [trendData, dayOfWeekTrends, consistencyMetrics])

  const trendsData: AttendanceTrendsData = {
    trendData,
    dayOfWeekTrends,
    consistencyMetrics,
    summary,
  }

  return {
    periodType,
    setPeriodType,
    projectId,
    setProjectId,
    fromDate,
    setFromDate,
    toDate,
    setToDate,
    projects: projectRepo.all,
    attendees: attendeeRepo.all,
    trendsData,
    dataLoading: !!(projectRepo as any).loading || !!(attendeeRepo as any).loading,
  }
}
