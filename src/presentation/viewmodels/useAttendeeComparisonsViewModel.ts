// ─── Attendee Comparisons ViewModel ──────────────────────────────────────────
import { useState, useMemo } from 'react'
import { useContainer } from '../../infrastructure/di/RepositoryProvider'
import type { AttendanceEntry, Attendee, Project } from '../../domain/entities'

export interface AttendeeComparisonRow {
  attendee_id:     string
  name:            string
  employee_id:     string
  role:            string
  project:         string
  present_count:   number
  late_count:      number
  absent_count:    number
  total_records:   number
  present_pct:     number
  late_pct:        number
  absent_pct:      number
  wfh_count:       number
  office_count:    number
  wfh_pct:         number
  office_pct:      number
}

export interface AttendeeComparisonsViewModel {
  // Data
  projects:        Project[]
  attendees:       Attendee[]
  attendance:      AttendanceEntry[]
  
  // Filters
  projectFilter:   string;  setProjectFilter:   (v: string) => void
  roleFilter:      string;  setRoleFilter:      (v: string) => void
  statusFilter:    string;  setStatusFilter:    (v: string) => void
  periodFilter:    'all' | 'week' | 'month' | 'prev_month' | 'quarter' | 'custom';  setPeriodFilter:  (v: 'all' | 'week' | 'month' | 'prev_month' | 'quarter' | 'custom') => void
  customDateRange: { startDate: string; endDate: string };  setCustomDateRange: (range: { startDate: string; endDate: string }) => void
  sortBy:          'name' | 'present' | 'late' | 'absent' | 'wfh';  setSortBy: (v: 'name' | 'present' | 'late' | 'absent' | 'wfh') => void
  
  // Selection & Delete
  selectionMode:   boolean;  toggleSelectionMode: () => void
  selectedIds:     Set<string>;  setSelectedIds:      (ids: Set<string>) => void
  selectAll:       (checked: boolean) => void
  toggleSelect:    (attendeeId: string, checked: boolean) => void
  deleteSelected:  (ids: string[]) => void
  
  // Derived
  comparisons:     AttendeeComparisonRow[]
  dataLoading:     boolean
  periodLabel:     string
  allSelected:     boolean
}

export function useAttendeeComparisonsViewModel(): AttendeeComparisonsViewModel {
  const { attendeeRepo, projectRepo, attendanceRepo } = useContainer()

  const [projectFilter, setProjectFilter] = useState('')
  const [roleFilter,    setRoleFilter]    = useState('')
  const [statusFilter,  setStatusFilter]  = useState('')
  const [periodFilter,  setPeriodFilter]  = useState<'all' | 'week' | 'month' | 'prev_month' | 'quarter' | 'custom'>('all')
  const [customDateRange, setCustomDateRange] = useState({ startDate: '', endDate: '' })
  const [sortBy,        setSortBy]        = useState<'name' | 'present' | 'late' | 'absent' | 'wfh'>('name')
  const [selectionMode, setSelectionMode] = useState(false)
  const [selectedIds,   setSelectedIds]   = useState<Set<string>>(new Set())

  // Helper: Get date ranges for different periods
  const getDateRanges = () => {
    const today = new Date()
    const year = today.getFullYear()
    const month = today.getMonth()
    const date = today.getDate()

    // This week (Monday to Sunday)
    const dayOfWeek = today.getDay()
    const diff = today.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1)
    const monday = new Date(today.setDate(diff))
    const thisWeekStart = monday.toISOString().split('T')[0]
    const thisWeekEnd = today.toISOString().split('T')[0]

    // This month
    const thisMonthStart = new Date(year, month, 1).toISOString().split('T')[0]
    const thisMonthEnd = today.toISOString().split('T')[0]

    // Previous month
    const prevMonthStart = new Date(year, month - 1, 1).toISOString().split('T')[0]
    const prevMonthEnd = new Date(year, month, 0).toISOString().split('T')[0]

    // This quarter
    const quarter = Math.ceil((month + 1) / 3)
    const quarterStart = new Date(year, (quarter - 1) * 3, 1).toISOString().split('T')[0]
    const quarterEnd = today.toISOString().split('T')[0]

    return { thisWeekStart, thisWeekEnd, thisMonthStart, thisMonthEnd, prevMonthStart, prevMonthEnd, quarterStart, quarterEnd }
  }

  // Helper: Get records for current period
  const filterByPeriod = (records: AttendanceEntry[]) => {
    if (periodFilter === 'all') return records

    const ranges = getDateRanges()
    let startDate = ''
    let endDate = ''

    switch (periodFilter) {
      case 'week':
        startDate = ranges.thisWeekStart
        endDate = ranges.thisWeekEnd
        break
      case 'month':
        startDate = ranges.thisMonthStart
        endDate = ranges.thisMonthEnd
        break
      case 'prev_month':
        startDate = ranges.prevMonthStart
        endDate = ranges.prevMonthEnd
        break
      case 'quarter':
        startDate = ranges.quarterStart
        endDate = ranges.quarterEnd
        break
      case 'custom':
        startDate = customDateRange.startDate
        endDate = customDateRange.endDate
        break
      default:
        return records
    }

    return records.filter(r => r.date >= startDate && r.date <= endDate)
  }

  // Get period label
  const getPeriodLabel = () => {
    if (periodFilter === 'all') return 'All Time'
    if (periodFilter === 'custom' && customDateRange.startDate && customDateRange.endDate) {
      return `${customDateRange.startDate} to ${customDateRange.endDate}`
    }

    const today = new Date()
    const year = today.getFullYear()
    const month = today.getMonth()

    switch (periodFilter) {
      case 'week': {
        const startDate = new Date(today)
        startDate.setDate(today.getDate() - today.getDay() + (today.getDay() === 0 ? -6 : 1))
        return `Week of ${startDate.toLocaleDateString()}`
      }
      case 'month': {
        const monthName = today.toLocaleDateString('en-US', { month: 'long' })
        return `${monthName} ${year}`
      }
      case 'prev_month': {
        const prevDate = new Date(year, month - 1)
        const prevMonthName = prevDate.toLocaleDateString('en-US', { month: 'long' })
        return `${prevMonthName} ${prevDate.getFullYear()}`
      }
      case 'quarter': {
        const quarter = Math.ceil((month + 1) / 3)
        return `Q${quarter} ${year}`
      }
      case 'custom':
        return 'Custom Range'
      default:
        return 'All Time'
    }
  }

  // Get all attendance records and filter by period
  const attendance = useMemo(
    () => filterByPeriod(attendanceRepo.all),
    [attendanceRepo.all, periodFilter, customDateRange]
  )

  // Filter attendees
  const filteredAttendees = useMemo(() => {
    return attendeeRepo.all.filter(a => {
      if (projectFilter && a.project !== projectFilter) return false
      if (roleFilter    && a.role    !== roleFilter)    return false
      if (statusFilter  && a.status  !== statusFilter)  return false
      return true
    })
  }, [attendeeRepo.all, projectFilter, roleFilter, statusFilter])

  // Calculate comparisons
  const comparisons = useMemo(() => {
    return filteredAttendees
      .map(attendee => {
        const attendeeRecords = attendance.filter(r => r.attendee_id === attendee.id)
        const presentCount = attendeeRecords.filter(r => r.status === 'present').length
        const lateCount    = attendeeRecords.filter(r => r.status === 'late').length
        const absentCount  = attendeeRecords.filter(r => r.status === 'absent').length
        const wfhCount     = attendeeRecords.filter(r => r.work_mode === 'wfh').length
        const officeCount  = attendeeRecords.filter(r => r.work_mode === 'office').length
        const total        = attendeeRecords.length || 1 // Avoid division by zero

        return {
          attendee_id: attendee.id,
          name:        attendee.name,
          employee_id: attendee.employee_id,
          role:        attendee.role,
          project:     attendee.project,
          present_count: presentCount,
          late_count:    lateCount,
          absent_count:  absentCount,
          total_records: attendeeRecords.length,
          present_pct: Math.round((presentCount / total) * 100),
          late_pct:    Math.round((lateCount / total) * 100),
          absent_pct:  Math.round((absentCount / total) * 100),
          wfh_count:   wfhCount,
          office_count: officeCount,
          wfh_pct:     Math.round((wfhCount / total) * 100),
          office_pct:  Math.round((officeCount / total) * 100),
        }
      })
      .sort((a, b) => {
        switch (sortBy) {
          case 'present':
            return b.present_count - a.present_count
          case 'late':
            return b.late_count - a.late_count
          case 'absent':
            return b.absent_count - a.absent_count
          case 'wfh':
            return b.wfh_count - a.wfh_count
          case 'name':
          default:
            return a.name.localeCompare(b.name)
        }
      })
  }, [filteredAttendees, attendance, sortBy])

  // Selection handlers
  const selectAll = (checked: boolean) => {
    if (checked) {
      setSelectedIds(new Set(comparisons.map(c => c.attendee_id)))
    } else {
      setSelectedIds(new Set())
    }
  }

  const toggleSelect = (attendeeId: string, checked: boolean) => {
    const newSelected = new Set(selectedIds)
    if (checked) {
      newSelected.add(attendeeId)
    } else {
      newSelected.delete(attendeeId)
    }
    setSelectedIds(newSelected)
  }

  const deleteSelected = (ids: string[]) => {
    ids.forEach(id => {
      // Delete attendance records for the selected attendee
      attendanceRepo.all
        .filter(r => r.attendee_id === id)
        .forEach(r => attendanceRepo.removeEntry(r.id))
    })
    setSelectedIds(new Set())
  }

  const allSelected = selectedIds.size === comparisons.length && comparisons.length > 0

  const toggleSelectionMode = () => {
    setSelectionMode(!selectionMode)
    if (selectionMode) {
      setSelectedIds(new Set())
    }
  }

  return {
    projects:       projectRepo.all,
    attendees:      attendeeRepo.all,
    attendance,
    projectFilter,  setProjectFilter,
    roleFilter,     setRoleFilter,
    statusFilter,   setStatusFilter,
    periodFilter,   setPeriodFilter,
    customDateRange, setCustomDateRange,
    sortBy,         setSortBy,
    selectionMode,  toggleSelectionMode,
    selectedIds,    setSelectedIds,
    selectAll,
    toggleSelect,
    deleteSelected,
    comparisons,
    dataLoading:    false,
    periodLabel:    getPeriodLabel(),
    allSelected,
  }
}
