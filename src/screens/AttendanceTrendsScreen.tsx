import { useState, useMemo, useRef } from 'react'
import { ChevronLeft, Calendar, TrendingUp, Users, Activity, AlertCircle, Download, Bookmark, Plus, Search, Bell, Play, Eye, X, BarChart2 } from 'lucide-react'
import { useAttendanceTrendsViewModel } from '../presentation/viewmodels/useAttendanceTrendsViewModel'
import { useReportsData } from '../presentation/viewmodels/useReportsViewModel'
import { AttendanceTrendChart } from '../components/ui/AttendanceTrendChart'
import { AttendanceByDayChart } from '../components/ui/AttendanceByDayChart'
import { DatePickerPopover } from '../components/ui/DatePickerPopover'
import { SelectDropdown } from '../components/ui/SelectDropdown'
import { ShimmerStyle, SkeletonLine, SkeletonMetricCard, SkeletonTableRows } from '../components/ui/Skeleton'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts'

type ReportType = 'trends' | 'daily' | 'late' | 'absent' | 'wfh'

const REPORT_TYPES: { id: ReportType; label: string; icon: string }[] = [
  { id: 'trends',  label: 'Trends',         icon: '📊' },
  { id: 'daily',   label: 'Daily Summary',  icon: '📅' },
  { id: 'late',    label: 'Late Arrivals',  icon: '⏰' },
  { id: 'absent',  label: 'Absenteeism',    icon: '👤' },
  { id: 'wfh',     label: 'WFH Report',     icon: '🏠' },
]

function downloadCSV(rows: Record<string, string | number>[], filename: string) {
  if (!rows.length) return
  const headers = Object.keys(rows[0])
  const csv = [
    headers.join(','),
    ...rows.map(row => headers.map(h => `"${String(row[h]).replace(/"/g, '""')}"`).join(',')),
  ].join('\n')
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

function DrillModal({ date, projectId, onClose }: { date: string; projectId: string; onClose: () => void }) {
  const { attendanceRecords, attendees, projects } = useReportsData()
  const proj = projects.find(p => p.id === projectId)
  const recs = attendanceRecords.filter(r => r.date === date && (projectId === '' || r.project_id === projectId))

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[80vh] flex flex-col" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div>
            <h2 className="font-semibold text-gray-900">
              {new Date(date + 'T00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
            </h2>
            <p className="text-xs text-gray-400">{proj?.name ?? 'All Projects'} · {recs.length} records</p>
          </div>
          <button onClick={onClose}><X className="w-5 h-5 text-gray-400 hover:text-gray-600" /></button>
        </div>
        <div className="overflow-y-auto flex-1">
          <table className="w-full">
            <thead className="sticky top-0 bg-white">
              <tr className="border-b border-gray-100">
                {['Attendee', 'Join Time', 'Status', 'Work Mode', 'Late (min)', 'Notes'].map(col => (
                  <th key={col} className="px-4 py-3 text-left text-[11px] font-semibold text-gray-400 uppercase tracking-wider">{col}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {recs.map(r => {
                const att = attendees.find(a => a.id === r.attendee_id)
                const [h, m] = (r.join_time ?? '').split(':').map(Number)
                const fmt = r.join_time ? `${h % 12 || 12}:${String(m).padStart(2, '0')} ${h >= 12 ? 'PM' : 'AM'}` : '—'
                return (
                  <tr key={r.id} className="hover:bg-gray-50/60">
                    <td className="px-4 py-3">
                      <p className="text-sm font-medium text-gray-900">{att?.name ?? 'Unknown'}</p>
                      <p className="text-xs text-gray-400">{att?.employee_id}</p>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700">{fmt}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        r.status === 'present' ? 'bg-green-50 text-green-700' :
                        r.status === 'late'    ? 'bg-orange-50 text-orange-700' :
                                                  'bg-red-50 text-red-700'
                      }`}>{r.status}</span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700 capitalize">{r.work_mode ?? '—'}</td>
                    <td className="px-4 py-3 text-sm text-gray-700">{r.minutes_late > 0 ? r.minutes_late : '—'}</td>
                    <td className="px-4 py-3 text-xs text-gray-500">{r.notes || '—'}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
          {recs.length === 0 && <p className="py-12 text-center text-sm text-gray-400">No records for this date.</p>}
        </div>
      </div>
    </div>
  )
}

export default function AttendanceTrendsScreen() {
  const trendsVM = useAttendanceTrendsViewModel()
  const reportsVM = useReportsData()

  const [reportType, setReportType] = useState<ReportType>('trends')
  const [filterProject, setFilterProject] = useState('')
  const [timePeriod, setTimePeriod] = useState<'all' | 'week' | 'month' | 'prev_month' | 'quarter' | 'custom'>('month')
  const [customFromDate, setCustomFromDate] = useState(() => {
    const d = new Date(); d.setDate(d.getDate() - 13); return d.toISOString().slice(0, 10)
  })
  const [customToDate, setCustomToDate] = useState(new Date().toISOString().slice(0, 10))
  const [filterAttendee, setFilterAttendee] = useState('')
  const [drillDate, setDrillDate] = useState<string | null>(null)
  const [expandConsistency, setExpandConsistency] = useState(false)
  const [expandedReportDetails, setExpandedReportDetails] = useState(false)
  const [reportOptions, setReportOptions] = useState({ includeChart: true, includeDetails: true, includeNotes: true })
  const [showOptionsPopover, setShowOptionsPopover] = useState(false)

  // Calculate date range based on time period
  const { fromDate, toDate } = useMemo(() => {
    const today = new Date()
    
    // Helper to format date as YYYY-MM-DD in local timezone (not UTC)
    const formatLocalDate = (d: Date): string => {
      const year = d.getFullYear()
      const month = String(d.getMonth() + 1).padStart(2, '0')
      const day = String(d.getDate()).padStart(2, '0')
      return `${year}-${month}-${day}`
    }
    
    if (timePeriod === 'custom') {
      return { fromDate: customFromDate, toDate: customToDate }
    } else if (timePeriod === 'week') {
      // This week: Sunday to today
      const start = new Date(today)
      const day = start.getDay()
      start.setDate(start.getDate() - day) // Go to this Sunday
      return { fromDate: formatLocalDate(start), toDate: formatLocalDate(today) }
    } else if (timePeriod === 'month') {
      // Current month: 1st to today
      const start = new Date(today.getFullYear(), today.getMonth(), 1)
      return { fromDate: formatLocalDate(start), toDate: formatLocalDate(today) }
    } else if (timePeriod === 'prev_month') {
      // Previous month: full calendar month (1st to last day)
      const start = new Date(today.getFullYear(), today.getMonth() - 1, 1)
      const end = new Date(today.getFullYear(), today.getMonth(), 0) // Last day of previous month
      return { fromDate: formatLocalDate(start), toDate: formatLocalDate(end) }
    } else if (timePeriod === 'quarter') {
      // Current quarter: 1st of quarter month to today
      const q = Math.floor(today.getMonth() / 3)
      const start = new Date(today.getFullYear(), q * 3, 1)
      return { fromDate: formatLocalDate(start), toDate: formatLocalDate(today) }
    } else {
      // all time - get last 90 days
      const start = new Date(today)
      start.setDate(today.getDate() - 89)
      return { fromDate: formatLocalDate(start), toDate: formatLocalDate(today) }
    }
  }, [timePeriod, customFromDate, customToDate])

  const selectedProject = trendsVM.projects.find(p => p.id === filterProject)
  const projectLabel = selectedProject ? selectedProject.name : 'All Projects'

  // Presets management
  const PRESET_KEY = 'report_presets_v1'
  const [presets, setPresets] = useState<any[]>([])
  const importInputRef = useRef<HTMLInputElement | null>(null)

  // Helper: Check if date is a weekend
  const isWeekend = (dateStr: string): boolean => {
    const dayOfWeek = new Date(dateStr + 'T00:00').getDay()
    return dayOfWeek === 0 || dayOfWeek === 6
  }

  // Helper: Check if date is a public holiday
  const isPublicHoliday = (dateStr: string): boolean => {
    return !!reportsVM.holidays?.find(h => h.holiday_date === dateStr)
  }

  // Helper: Check if date is a working day
  const isWorkingDay = (dateStr: string): boolean => {
    return !isWeekend(dateStr) && !isPublicHoliday(dateStr)
  }

  const baseRecords = useMemo(() => {
    return reportsVM.attendanceRecords.filter(r => {
      if (r.date < fromDate || r.date > toDate) return false
      if (filterProject !== '' && r.project_id !== filterProject) return false
      if (filterAttendee !== '' && r.attendee_id !== filterAttendee) return false
      if (!isWorkingDay(r.date)) return false // Exclude weekends and holidays
      return true
    })
  }, [reportsVM.attendanceRecords, fromDate, toDate, filterProject, filterAttendee])

  const uniqueDates = useMemo(() => {
    const set = new Set(baseRecords.map(r => r.date))
    return Array.from(set).sort()
  }, [baseRecords])

  // Daily rows
  const dailyRows = useMemo(() => {
    return uniqueDates.map(date => {
      const dayRecs = baseRecords.filter(r => r.date === date)
      const present = dayRecs.filter(r => r.status === 'present').length
      const late = dayRecs.filter(r => r.status === 'late').length
      const absent = dayRecs.filter(r => r.status === 'absent').length
      const total = dayRecs.length
      const rate = total > 0 ? Math.round(((present + late) / total) * 100) : 0
      return { date, day: new Date(date + 'T00:00').toLocaleDateString('en-US', { weekday: 'short' }), total, present, late, absent, rate }
    })
  }, [uniqueDates, baseRecords])

  // Late rows
  const lateRows = useMemo(() => {
    return baseRecords
      .filter(r => r.status === 'late')
      .map(r => {
        const att = reportsVM.attendees.find(a => a.id === r.attendee_id)
        const proj = reportsVM.projects.find(p => p.id === r.project_id)
        const [h, m] = (r.join_time ?? '').split(':').map(Number)
        const fmt = r.join_time ? `${h % 12 || 12}:${String(m).padStart(2, '0')} ${h >= 12 ? 'PM' : 'AM'}` : '—'
        return { date: r.date, attendee: att?.name ?? '—', emp_id: att?.employee_id ?? '—', project: proj?.name ?? '—', join_time: fmt, minutes_late: r.minutes_late, work_mode: r.work_mode ?? '—' }
      })
      .sort((a, b) => b.minutes_late - a.minutes_late)
  }, [baseRecords, reportsVM.attendees, reportsVM.projects])

  // Absent rows
  const absentRows = useMemo(() => {
    return baseRecords
      .filter(r => r.status === 'absent')
      .map(r => {
        const att = reportsVM.attendees.find(a => a.id === r.attendee_id)
        const proj = reportsVM.projects.find(p => p.id === r.project_id)
        return { date: r.date, day: new Date(r.date + 'T00:00').toLocaleDateString('en-US', { weekday: 'short' }), attendee: att?.name ?? '—', emp_id: att?.employee_id ?? '—', project: proj?.name ?? '—', notes: r.notes || '—' }
      })
      .sort((a, b) => b.date.localeCompare(a.date))
  }, [baseRecords, reportsVM.attendees, reportsVM.projects])

  // WFH rows
  const wfhRows = useMemo(() => {
    const totalByAtt: Record<string, { name: string; emp: string; office: number; wfh: number; total: number }> = {}
    baseRecords.filter(r => r.status !== 'absent').forEach(r => {
      const att = reportsVM.attendees.find(a => a.id === r.attendee_id)
      if (!totalByAtt[r.attendee_id]) totalByAtt[r.attendee_id] = { name: att?.name ?? '—', emp: att?.employee_id ?? '—', office: 0, wfh: 0, total: 0 }
      if (r.work_mode === 'office') totalByAtt[r.attendee_id].office++
      if (r.work_mode === 'wfh') totalByAtt[r.attendee_id].wfh++
      totalByAtt[r.attendee_id].total++
    })
    return Object.values(totalByAtt).map(row => ({
      ...row,
      wfh_pct: row.total > 0 ? Math.round((row.wfh / row.total) * 100) : 0,
    })).sort((a, b) => b.wfh_pct - a.wfh_pct)
  }, [baseRecords, reportsVM.attendees])

  // Metrics summary
  const summary = useMemo(() => {
    const total = baseRecords.length
    const present = baseRecords.filter(r => r.status === 'present').length
    const late = baseRecords.filter(r => r.status === 'late').length
    const absent = baseRecords.filter(r => r.status === 'absent').length
    const wfh = baseRecords.filter(r => r.work_mode === 'wfh').length
    return {
      total,
      attendanceRate: total > 0 ? Math.round(((present + late) / total) * 100) : 0,
      lateRate: total > 0 ? Math.round((late / total) * 100) : 0,
      absentRate: total > 0 ? Math.round((absent / total) * 100) : 0,
      wfhRate: (present + late) > 0 ? Math.round((wfh / (present + late)) * 100) : 0,
    }
  }, [baseRecords])

  // Export CSV
  const handleExportCSV = () => {
    if (reportType === 'daily') {
      downloadCSV(dailyRows.map(r => ({
        Date: r.date, Day: r.day, Total: r.total, Present: r.present, Late: r.late, Absent: r.absent, 'Attendance Rate': `${r.rate}%`,
      })), `daily-summary-${fromDate}-to-${toDate}.csv`)
    } else if (reportType === 'late') {
      downloadCSV(lateRows.map(r => {
        const base: any = { Date: r.date, Attendee: r.attendee, 'Employee ID': r.emp_id, Project: r.project }
        if (reportOptions.includeDetails) base['Join Time'] = r.join_time
        base['Minutes Late'] = r.minutes_late
        if (reportOptions.includeDetails) base['Work Mode'] = r.work_mode
        return base
      }), `late-arrivals-${fromDate}-to-${toDate}.csv`)
    } else if (reportType === 'absent') {
      downloadCSV(absentRows.map(r => {
        const base: any = { Date: r.date, Day: r.day, Attendee: r.attendee, 'Employee ID': r.emp_id, Project: r.project }
        if (reportOptions.includeNotes) base['Notes'] = r.notes
        return base
      }), `absences-${fromDate}-to-${toDate}.csv`)
    } else if (reportType === 'wfh') {
      downloadCSV(wfhRows.map(r => ({
        Attendee: r.name, 'Employee ID': r.emp, 'Office Days': r.office, 'WFH Days': r.wfh, 'Total Days': r.total, 'WFH %': `${r.wfh_pct}%`,
      })), `wfh-report-${fromDate}-to-${toDate}.csv`)
    }
  }

  const attendeesForFilter = useMemo(() => {
    if (filterProject === '') return reportsVM.attendees
    const proj = reportsVM.projects.find(p => p.id === filterProject)
    return reportsVM.attendees.filter(a => a.project === proj?.name)
  }, [reportsVM.attendees, reportsVM.projects, filterProject])

  const chartTitle: Record<ReportType, string> = {
    trends: 'Attendance Trends',
    daily: 'Attendance by Day',
    late: 'Late Arrivals by Day',
    absent: 'Absences by Day',
    wfh: 'WFH vs Office by Attendee',
  }

  const chartData = useMemo(() => {
    if (reportType === 'wfh') {
      return wfhRows.slice(0, 8).map(r => ({ name: r.name.split(' ')[0], office: r.office, wfh: r.wfh }))
    }
    return dailyRows.map(r => ({ date: r.date.slice(5), present: r.present, late: r.late, absent: r.absent }))
  }, [reportType, dailyRows, wfhRows])

  const dataLoading = trendsVM.dataLoading || reportsVM.dataLoading

  return (
    <div className="p-6 min-h-full">
      <ShimmerStyle />

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Reports & Analytics</h1>
          <p className="text-sm text-gray-400 mt-0.5">Attendance trends, patterns, and detailed reports</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input type="text" placeholder="Search reports..." className="pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-200 w-52 bg-white" />
          </div>
          <button className="w-9 h-9 flex items-center justify-center rounded-lg border border-gray-200 bg-white hover:bg-gray-50">
            <Bell className="w-4 h-4 text-gray-500" />
          </button>
        </div>
      </div>

      <div className="flex gap-5">
        {/* Main */}
        <div className="flex-1 min-w-0 space-y-5">

          {/* Summary metrics */}
          <div className="grid grid-cols-4 gap-4">
            {dataLoading ? (
              <>{[0, 1, 2, 3].map(i => <SkeletonMetricCard key={i} />)}</>
            ) : (
              <>
                {[
                  { label: 'Attendance Rate', value: `${summary.attendanceRate}%`, sub: `${summary.total} records`, color: 'text-green-600' },
                  { label: 'Late Rate', value: `${summary.lateRate}%`, sub: 'of present+late', color: 'text-orange-600' },
                  { label: 'Absent Rate', value: `${summary.absentRate}%`, sub: 'of all records', color: 'text-red-600' },
                  { label: 'WFH Rate', value: `${summary.wfhRate}%`, sub: 'of present+late days', color: 'text-blue-600' },
                ].map(m => (
                  <div key={m.label} className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
                    <p className="text-[11px] text-gray-400 uppercase tracking-wide font-semibold">{m.label}</p>
                    <p className={`text-2xl font-bold mt-1 ${m.color}`}>{m.value}</p>
                    <p className="text-xs text-gray-400 mt-0.5">{m.sub}</p>
                  </div>
                ))}
              </>
            )}
          </div>

          {/* Report type tabs */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
            <h2 className="font-semibold text-gray-900 mb-4">Report Type</h2>
            <div className="grid grid-cols-5 gap-3">
              {REPORT_TYPES.map(rt => (
                <button key={rt.id} onClick={() => setReportType(rt.id)}
                  className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 text-sm font-medium transition-all ${
                    reportType === rt.id ? 'border-gray-900 bg-gray-900 text-white' : 'border-gray-200 hover:border-gray-300 text-gray-700'
                  }`}>
                  <span className="text-xl">{rt.icon}</span>{rt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Filters */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-gray-900">Filters</h2>
              <button onClick={() => { setFilterProject(''); setFilterAttendee(''); setTimePeriod('month') }}
                className="text-xs text-gray-400 hover:text-gray-600">Clear All</button>
            </div>
            <div className="grid grid-cols-5 gap-4 mb-4">
              <div>
                <label className="block text-xs text-gray-400 mb-1.5">Time Period</label>
                <SelectDropdown 
                  options={[
                    { label: 'All Time', value: 'all' },
                    { label: 'This Week', value: 'week' },
                    { label: 'Current Month', value: 'month' },
                    { label: 'Previous Month', value: 'prev_month' },
                    { label: 'Quarter', value: 'quarter' },
                    { label: 'Custom', value: 'custom' },
                  ]}
                  value={timePeriod}
                  onChange={(v) => setTimePeriod(v as any)}
                  className="h-9"
                />
              </div>
              {timePeriod === 'custom' && (
                <>
                  <div>
                    <label className="block text-xs text-gray-400 mb-1.5">From Date</label>
                    <DatePickerPopover value={customFromDate} onChange={setCustomFromDate} fullWidth placeholder="From date" />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-400 mb-1.5">To Date</label>
                    <DatePickerPopover value={customToDate} onChange={setCustomToDate} fullWidth placeholder="To date" />
                  </div>
                </>
              )}
              <div>
                <label className="block text-xs text-gray-400 mb-1.5">Project</label>
                <SelectDropdown
                  value={filterProject}
                  onChange={v => { setFilterProject(v); setFilterAttendee('') }}
                  options={[
                    { value: '', label: 'All Projects' },
                    ...reportsVM.projects.map(p => ({ value: p.id, label: p.name }))
                  ]}
                  allowClear
                  className="w-full"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1.5">Attendee</label>
                <SelectDropdown
                  value={filterAttendee}
                  onChange={setFilterAttendee}
                  options={[
                    { value: '', label: 'All Attendees' },
                    ...attendeesForFilter.map(a => ({ value: a.id, label: a.name }))
                  ]}
                  allowClear
                  className="w-full"
                />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button className="flex items-center gap-1.5 px-4 py-2 bg-gray-900 text-white text-sm font-medium rounded-xl hover:bg-gray-800 transition-colors">
                <Play className="w-3.5 h-3.5" /> Generate Report
              </button>
              <button onClick={() => setShowOptionsPopover(s => !s)} className="ml-2 px-3 py-2 border border-gray-200 text-sm rounded-xl text-gray-700 hover:bg-gray-50">
                Report Options
              </button>
              {showOptionsPopover && (
                <div className="absolute mt-10 w-56 bg-white border border-gray-100 rounded-xl shadow-lg p-3 z-50">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-xs font-medium text-gray-900">Report Options</p>
                    <button onClick={() => setShowOptionsPopover(false)} className="text-xs text-gray-400">Close</button>
                  </div>
                  <label className="flex items-center gap-2 text-sm mb-2">
                    <input type="checkbox" checked={!!reportOptions.includeChart} onChange={e => setReportOptions(o => ({ ...o, includeChart: e.target.checked }))} />
                    <span className="text-xs text-gray-700">Include chart</span>
                  </label>
                  <label className="flex items-center gap-2 text-sm mb-2">
                    <input type="checkbox" checked={!!reportOptions.includeDetails} onChange={e => setReportOptions(o => ({ ...o, includeDetails: e.target.checked }))} />
                    <span className="text-xs text-gray-700">Include detailed rows</span>
                  </label>
                  <label className="flex items-center gap-2 text-sm">
                    <input type="checkbox" checked={!!reportOptions.includeNotes} onChange={e => setReportOptions(o => ({ ...o, includeNotes: e.target.checked }))} />
                    <span className="text-xs text-gray-700">Include notes</span>
                  </label>
                </div>
              )}
              <button onClick={handleExportCSV} className="flex items-center gap-1.5 px-4 py-2 border border-gray-200 text-sm font-medium text-gray-700 rounded-xl hover:bg-gray-50 transition-colors">
                <Download className="w-3.5 h-3.5" /> Export CSV
              </button>
            </div>
          </div>

          {/* Chart */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="font-semibold text-gray-900">{chartTitle[reportType]}</h2>
                <p className="text-xs text-gray-400">{fromDate} → {toDate}</p>
              </div>
              <BarChart2 className="w-4 h-4 text-gray-300" />
            </div>
            {dataLoading ? (
              <div className="h-52 flex items-end gap-1.5 px-2 pb-2">
                {[65, 85, 50, 90, 70, 80, 45, 95, 60, 75].map((pct, i) => (
                  <div key={i} className="flex-1 bg-gray-100 animate-pulse rounded-t" style={{ height: `${pct}%` }} />
                ))}
              </div>
            ) : chartData.length > 0 ? (
              <>
                <div className="h-52">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData} barSize={14} barGap={3}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" vertical={false} />
                      <XAxis dataKey={reportType === 'wfh' ? 'name' : 'date'} tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
                      <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #e5e7eb' }} />
                      {reportType === 'wfh' ? (
                        <>
                          <Bar dataKey="office" name="Office" fill="#1f2937" radius={[3, 3, 0, 0]} />
                          <Bar dataKey="wfh" name="WFH" fill="#9ca3af" radius={[3, 3, 0, 0]} />
                        </>
                      ) : (
                        <>
                          <Bar dataKey="present" name="Present" fill="#1f2937" radius={[3, 3, 0, 0]} />
                          <Bar dataKey="late" name="Late" fill="#f97316" radius={[3, 3, 0, 0]} />
                          <Bar dataKey="absent" name="Absent" fill="#e5e7eb" radius={[3, 3, 0, 0]} />
                        </>
                      )}
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                <div className="flex items-center gap-5 mt-2">
                  {reportType === 'wfh'
                    ? [['Office', '#1f2937'], ['WFH', '#9ca3af']].map(([l, c]) => (
                      <div key={l} className="flex items-center gap-1.5 text-xs text-gray-500">
                        <div className="w-3 h-2 rounded-sm" style={{ backgroundColor: c }} />{l}
                      </div>
                    ))
                    : [['Present', '#1f2937'], ['Late', '#f97316'], ['Absent', '#e5e7eb']].map(([l, c]) => (
                      <div key={l} className="flex items-center gap-1.5 text-xs text-gray-500">
                        <div className="w-3 h-2 rounded-sm" style={{ backgroundColor: c }} />{l}
                      </div>
                    ))
                  }
                </div>
              </>
            ) : (
              <div className="h-52 flex items-center justify-center">
                <p className="text-sm text-gray-400">No data in selected date range.</p>
              </div>
            )}
          </div>

          {/* Detailed Data */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
              <div>
                <h2 className="font-semibold text-gray-900">Detailed Data</h2>
                <p className="text-xs text-gray-400">
                  {reportType === 'trends' && 'Trends analysis'}
                  {reportType === 'daily' && `${dailyRows.length} day records`}
                  {reportType === 'late' && `${lateRows.length} late arrivals`}
                  {reportType === 'absent' && `${absentRows.length} absences`}
                  {reportType === 'wfh' && `${wfhRows.length} attendees`}
                  {' '}· {fromDate} to {toDate}
                </p>
              </div>
            </div>

            {/* Trends view */}
            {reportType === 'trends' && (
              <div className="p-5">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-3">Team Consistency</h3>
                    <table className="w-full text-sm">
                      <tbody className="divide-y divide-gray-100">
                        {trendsVM.trendsData.consistencyMetrics.slice(0, 5).map(m => (
                          <tr key={m.attendee_id} className="hover:bg-gray-50/60">
                            <td className="py-2"><p className="font-medium text-gray-900">{m.attendeeName}</p></td>
                            <td className="py-2 text-right">
                              <span className="text-xs font-semibold">{m.consistencyScore}/100</span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-4">Day of Week Summary</h3>
                    <ResponsiveContainer width="100%" height={280}>
                      <BarChart data={trendsVM.trendsData.dayOfWeekTrends} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
                        <defs>
                          <linearGradient id="dayGradient" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.8} />
                            <stop offset="100%" stopColor="#1e40af" stopOpacity={0.6} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                        <XAxis dataKey="day" tick={{ fontSize: 12, fill: '#6b7280' }} />
                        <YAxis tick={{ fontSize: 12, fill: '#6b7280' }} />
                        <Tooltip 
                          contentStyle={{ backgroundColor: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: '8px', padding: '10px' }}
                          formatter={(value: any) => [`${value}%`, 'Attendance Rate']}
                          cursor={{ fill: 'rgba(59, 130, 246, 0.1)' }}
                        />
                        <Bar 
                          dataKey="avgAttendance" 
                          fill="url(#dayGradient)" 
                          radius={[8, 8, 0, 0]}
                          animationDuration={800}
                          animationEasing="ease-in-out"
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>
            )}

            {/* Daily Summary table */}
            {reportType === 'daily' && (
              <table className="w-full">
                <thead><tr className="border-b border-gray-100">
                  {['Date', 'Total', 'Present', 'Late', 'Absent', 'Rate', 'View'].map(c => (
                    <th key={c} className="px-5 py-3 text-left text-[11px] font-semibold text-gray-400 uppercase tracking-wider">{c}</th>
                  ))}
                </tr></thead>
                <tbody className="divide-y divide-gray-50">
                  {dataLoading ? (
                    <SkeletonTableRows rows={5} cols={7} />
                  ) : dailyRows.map(row => (
                    <tr key={row.date} className="hover:bg-gray-50/60">
                      <td className="px-5 py-3.5">
                        <p className="text-sm font-medium text-gray-900">{row.date}</p>
                        <p className="text-xs text-gray-400">{row.day}</p>
                      </td>
                      <td className="px-5 py-3.5 text-sm text-gray-700">{row.total}</td>
                      <td className="px-5 py-3.5 text-sm text-green-700 font-medium">{row.present}</td>
                      <td className="px-5 py-3.5 text-sm text-orange-600 font-medium">{row.late}</td>
                      <td className="px-5 py-3.5 text-sm text-red-600 font-medium">{row.absent}</td>
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-2">
                          <div className="w-16 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                            <div className="h-full bg-gray-900 rounded-full" style={{ width: `${row.rate}%` }} />
                          </div>
                          <span className="text-sm font-semibold text-gray-900">{row.rate}%</span>
                        </div>
                      </td>
                      <td className="px-5 py-3.5">
                        <button onClick={() => setDrillDate(row.date)} className="text-gray-300 hover:text-gray-600 transition-colors">
                          <Eye className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            {/* Late Arrivals table */}
            {reportType === 'late' && (
              <table className="w-full">
                <thead><tr className="border-b border-gray-100">
                  {['Date', 'Attendee', 'Project', 'Join Time', 'Late (min)', 'Work Mode'].map(c => (
                    <th key={c} className="px-5 py-3 text-left text-[11px] font-semibold text-gray-400 uppercase tracking-wider">{c}</th>
                  ))}
                </tr></thead>
                <tbody className="divide-y divide-gray-50">
                  {lateRows.map((row, i) => (
                    <tr key={i} className="hover:bg-gray-50/60">
                      <td className="px-5 py-3.5 text-sm text-gray-700">{row.date}</td>
                      <td className="px-5 py-3.5">
                        <p className="text-sm font-medium text-gray-900">{row.attendee}</p>
                        <p className="text-xs text-gray-400">{row.emp_id}</p>
                      </td>
                      <td className="px-5 py-3.5 text-sm text-gray-700">{row.project}</td>
                      <td className="px-5 py-3.5 text-sm text-gray-700">{row.join_time}</td>
                      <td className="px-5 py-3.5">
                        <span className="px-2 py-1 bg-orange-50 text-orange-700 rounded-lg text-xs font-semibold">{row.minutes_late}m</span>
                      </td>
                      <td className="px-5 py-3.5 text-sm text-gray-700 capitalize">{row.work_mode}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            {/* Absenteeism table */}
            {reportType === 'absent' && (
              <table className="w-full">
                <thead><tr className="border-b border-gray-100">
                  {['Date', 'Attendee', 'Project', 'Notes'].map(c => (
                    <th key={c} className="px-5 py-3 text-left text-[11px] font-semibold text-gray-400 uppercase tracking-wider">{c}</th>
                  ))}
                </tr></thead>
                <tbody className="divide-y divide-gray-50">
                  {absentRows.map((row, i) => (
                    <tr key={i} className="hover:bg-gray-50/60">
                      <td className="px-5 py-3.5">
                        <p className="text-sm font-medium text-gray-900">{row.date}</p>
                        <p className="text-xs text-gray-400">{row.day}</p>
                      </td>
                      <td className="px-5 py-3.5">
                        <p className="text-sm font-medium text-gray-900">{row.attendee}</p>
                        <p className="text-xs text-gray-400">{row.emp_id}</p>
                      </td>
                      <td className="px-5 py-3.5 text-sm text-gray-700">{row.project}</td>
                      <td className="px-5 py-3.5 text-xs text-gray-500">{row.notes}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            {/* WFH table */}
            {reportType === 'wfh' && (
              <table className="w-full">
                <thead><tr className="border-b border-gray-100">
                  {['Attendee', 'Office Days', 'WFH Days', 'Total Days', 'WFH %'].map(c => (
                    <th key={c} className="px-5 py-3 text-left text-[11px] font-semibold text-gray-400 uppercase tracking-wider">{c}</th>
                  ))}
                </tr></thead>
                <tbody className="divide-y divide-gray-50">
                  {wfhRows.map((row, i) => (
                    <tr key={i} className="hover:bg-gray-50/60">
                      <td className="px-5 py-3.5">
                        <p className="text-sm font-medium text-gray-900">{row.name}</p>
                        <p className="text-xs text-gray-400">{row.emp}</p>
                      </td>
                      <td className="px-5 py-3.5 text-sm text-gray-700">{row.office}</td>
                      <td className="px-5 py-3.5 text-sm text-blue-600 font-medium">{row.wfh}</td>
                      <td className="px-5 py-3.5 text-sm text-gray-700">{row.total}</td>
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-2">
                          <div className="w-16 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                            <div className="h-full bg-blue-500 rounded-full" style={{ width: `${row.wfh_pct}%` }} />
                          </div>
                          <span className="text-sm font-semibold text-blue-600">{row.wfh_pct}%</span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            {baseRecords.length === 0 && (
              <div className="py-16 text-center">
                <p className="text-sm text-gray-400">No records match the selected filters.</p>
                <p className="text-xs text-gray-300 mt-1">Try expanding the date range or changing filters.</p>
              </div>
            )}
          </div>
        </div>

        {/* Right sidebar */}
        <div className="w-52 shrink-0 space-y-4">
          {/* Export */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-100">
              <h3 className="text-sm font-semibold text-gray-900">Export Options</h3>
            </div>
            <div className="p-3 space-y-2">
              <button onClick={handleExportCSV}
                className="w-full flex items-center gap-3 p-3 border border-gray-100 rounded-lg hover:bg-gray-50 transition-colors text-left">
                <Download className="w-4 h-4 text-gray-400 shrink-0" />
                <div>
                  <p className="text-xs font-medium text-gray-900">Export CSV</p>
                  <p className="text-[10px] text-gray-400">Spreadsheet format</p>
                </div>
              </button>
            </div>
          </div>

          {/* Quick stats */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 space-y-3">
            <h3 className="text-sm font-semibold text-gray-900">Quick Stats</h3>
            <div>
              <p className="text-xs text-gray-400">Total Records</p>
              <p className="text-lg font-bold text-gray-900">{summary.total}</p>
            </div>
            <div>
              <p className="text-xs text-gray-400">Date Range</p>
              <p className="text-xs font-medium text-gray-700">{uniqueDates.length} day{uniqueDates.length !== 1 ? 's' : ''}</p>
            </div>
            <div>
              <p className="text-xs text-gray-400">Projects</p>
              <p className="text-xs font-medium text-gray-700">{filterProject === '' ? reportsVM.projects.length : 1} project{filterProject === '' && reportsVM.projects.length !== 1 ? 's' : ''}</p>
            </div>
          </div>
        </div>
      </div>

      {drillDate && <DrillModal date={drillDate} projectId={filterProject} onClose={() => setDrillDate(null)} />}
    </div>
  )
}
