import { useState, useMemo, useRef } from 'react'
import { useEffect } from 'react'
import { Search, Bell, Plus, Play, Bookmark, Download, Eye, X, BarChart2 } from 'lucide-react'
import { SelectDropdown } from '../components/ui/SelectDropdown'
import { DatePickerPopover } from '../components/ui/DatePickerPopover'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts'
import { useReportsData } from '../presentation/viewmodels/useReportsViewModel'
import { ShimmerStyle, SkeletonMetricCard, SkeletonTableRows, SkeletonLine } from '../components/ui/Skeleton'

// ─── Types ────────────────────────────────────────────────────────────────────

type ReportType = 'daily' | 'late' | 'absent' | 'wfh'

const REPORT_TYPES: { id: ReportType; label: string; icon: string }[] = [
  { id: 'daily',  label: 'Daily Summary',  icon: '📅' },
  { id: 'late',   label: 'Late Arrivals',  icon: '⏰' },
  { id: 'absent', label: 'Absenteeism',    icon: '👤' },
  { id: 'wfh',    label: 'WFH Report',     icon: '🏠' },
]

// ─── CSV helper ───────────────────────────────────────────────────────────────

function downloadCSV(rows: Record<string, string | number>[], filename: string) {
  if (!rows.length) return
  const headers = Object.keys(rows[0])
  const csv = [
    headers.join(','),
    ...rows.map(row => headers.map(h => `"${String(row[h]).replace(/"/g, '""')}"`).join(',')),
  ].join('\n')
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url  = URL.createObjectURL(blob)
  const a    = document.createElement('a')
  a.href     = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

// ─── Attendance drill-down modal ──────────────────────────────────────────────

function DrillModal({ date, projectId, onClose }: { date: string; projectId: string; onClose: () => void }) {
  const { attendanceRecords, attendees, projects } = useReportsData()
  const proj = projects.find(p => p.id === projectId)
  const recs = attendanceRecords.filter(r => r.date === date && (projectId === 'all' || r.project_id === projectId))

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

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function DetailedReportsScreen() {
  const { attendanceRecords, attendees, projects, dataLoading } = useReportsData()

  const [reportType,   setReportType]   = useState<ReportType>('daily')
  const [filterProject,setFilterProject]= useState('all')
  const [fromDate,     setFromDate]     = useState(() => {
    const d = new Date(); d.setDate(d.getDate() - 13); return d.toISOString().slice(0, 10)
  })
  const [toDate,       setToDate]       = useState(new Date().toISOString().slice(0, 10))
  const [filterAttendee, setFilterAttendee] = useState('all')
  const [drillDate,    setDrillDate]    = useState<string | null>(null)
  // Presets and report options
  const PRESET_KEY = 'report_presets_v1'
  const PRESET_DEFAULT_KEY = 'report_presets_default_v1'
  type ReportPreset = { id: string; name: string; reportType: ReportType; fromDate: string; toDate: string; filterProject: string; filterAttendee: string; options?: ReportOptions }
  type ReportOptions = { includeChart?: boolean; includeDetails?: boolean; includeNotes?: boolean }

  const [presets, setPresets] = useState<ReportPreset[]>([])
  const [defaultPresetId, setDefaultPresetId] = useState<string | null>(null)
  const importInputRef = useRef<HTMLInputElement | null>(null)
  const [showSaveModal, setShowSaveModal] = useState(false)
  const [presetName, setPresetName] = useState('')
  const [reportOptions, setReportOptions] = useState<ReportOptions>({ includeChart: true, includeDetails: true, includeNotes: true })
  const [showOptionsPopover, setShowOptionsPopover] = useState(false)

  useEffect(() => {
    try {
      const raw = localStorage.getItem(PRESET_KEY)
      if (raw) setPresets(JSON.parse(raw))
    } catch (e) {
      console.warn('Failed to read presets', e)
    }
    try {
      const def = localStorage.getItem(PRESET_DEFAULT_KEY)
      if (def) setDefaultPresetId(def)
    } catch (e) { /* ignore */ }
  }, [])

  function persistPresets(next: ReportPreset[]) {
    try { localStorage.setItem(PRESET_KEY, JSON.stringify(next)); setPresets(next) } catch (e) { console.warn('Failed to persist presets', e) }
  }

  function persistDefaultPreset(id: string | null) {
    try { if (id) localStorage.setItem(PRESET_DEFAULT_KEY, id); else localStorage.removeItem(PRESET_DEFAULT_KEY); setDefaultPresetId(id) } catch (e) { console.warn('Failed to persist default preset', e) }
  }

  function buildCurrentPreset(name: string): ReportPreset {
    return { id: String(Date.now()), name, reportType, fromDate, toDate, filterProject, filterAttendee, options: reportOptions }
  }

  function handleSavePreset(name?: string) {
    const n = name ?? presetName ?? `Preset ${new Date().toLocaleString()}`
    if (!n.trim()) return
    const trimmed = n.trim()
    const existing = presets.find(p => p.name === trimmed)
    if (existing) {
      if (!confirm('A preset with this name exists. Overwrite?')) return
      const preset = { ...buildCurrentPreset(trimmed), id: existing.id }
      persistPresets([preset, ...presets.filter(p => p.id !== existing.id)])
    } else {
      const preset = buildCurrentPreset(trimmed)
      persistPresets([preset, ...presets])
    }
    setShowSaveModal(false)
    setPresetName('')
  }

  function handleApplyPreset(p: ReportPreset) {
    setReportType(p.reportType)
    setFromDate(p.fromDate)
    setToDate(p.toDate)
    setFilterProject(p.filterProject)
    setFilterAttendee(p.filterAttendee)
    setReportOptions(p.options ?? { includeChart: true, includeDetails: true, includeNotes: true })
  }

  function applyPresetFilters(p: ReportPreset) {
    setReportType(p.reportType)
    setFromDate(p.fromDate)
    setToDate(p.toDate)
    setFilterProject(p.filterProject)
    setFilterAttendee(p.filterAttendee)
  }

  function applyPresetOptions(p: ReportPreset) {
    setReportOptions(p.options ?? { includeChart: true, includeDetails: true, includeNotes: true })
  }

  function handleDeletePreset(id: string) {
    if (!confirm('Delete this preset?')) return
    persistPresets(presets.filter(p => p.id !== id))
  }

  function handleRenamePreset(p: ReportPreset) {
    const name = prompt('Rename preset', p.name)
    if (!name) return
    persistPresets(presets.map(x => x.id === p.id ? { ...x, name } : x))
  }

  function handleSetDefaultPreset(p: ReportPreset | null) {
    persistDefaultPreset(p ? p.id : null)
  }

  function handleExportPresets() {
    try {
      const payload = { exportedAt: new Date().toISOString(), presets }
      const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `report-presets-${new Date().toISOString().slice(0,10)}.json`
      a.click()
      URL.revokeObjectURL(url)
    } catch (e) { console.warn('Export presets failed', e) }
  }

  function handleImportPresets(file: File | null) {
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      try {
        const parsed = JSON.parse(String(reader.result))
        const incoming: ReportPreset[] = Array.isArray(parsed.presets) ? parsed.presets : (Array.isArray(parsed) ? parsed : [])
        // Merge, avoid id collisions
        const next = [...presets]
        incoming.forEach(p => {
          const exists = next.find(x => x.name === p.name)
          if (exists) return
          next.push({ ...p, id: String(Date.now()) + Math.random().toString(36).slice(2,6) })
        })
        persistPresets(next)
        alert('Imported presets')
      } catch (e) { alert('Failed to import presets') }
    }
    reader.readAsText(file)
  }

  function isPresetActive(p: ReportPreset) {
    const opts = p.options ?? { includeChart: true, includeDetails: true, includeNotes: true }
    const sameFilters = p.reportType === reportType && p.fromDate === fromDate && p.toDate === toDate && p.filterProject === filterProject && p.filterAttendee === filterAttendee
    const sameOptions = (opts.includeChart === !!reportOptions.includeChart) && (opts.includeDetails === !!reportOptions.includeDetails) && (opts.includeNotes === !!reportOptions.includeNotes)
    return sameFilters && sameOptions
  }

  // Filtered base records
  const baseRecords = useMemo(() => {
    return attendanceRecords.filter(r => {
      if (r.date < fromDate || r.date > toDate) return false
      if (filterProject !== 'all' && r.project_id !== filterProject) return false
      if (filterAttendee !== 'all' && r.attendee_id !== filterAttendee) return false
      return true
    })
  }, [attendanceRecords, fromDate, toDate, filterProject, filterAttendee])

  // Unique dates in range (weekdays only between from/to)
  const uniqueDates = useMemo(() => {
    const set = new Set(baseRecords.map(r => r.date))
    return Array.from(set).sort()
  }, [baseRecords])

  // ── Daily Summary rows ────────────────────────────────────────────────────
  const dailyRows = useMemo(() => {
    return uniqueDates.map(date => {
      const dayRecs = baseRecords.filter(r => r.date === date)
      const present = dayRecs.filter(r => r.status === 'present').length
      const late    = dayRecs.filter(r => r.status === 'late').length
      const absent  = dayRecs.filter(r => r.status === 'absent').length
      const total   = dayRecs.length
      const rate    = total > 0 ? Math.round(((present + late) / total) * 100) : 0
      return { date, day: new Date(date + 'T00:00').toLocaleDateString('en-US', { weekday: 'short' }), total, present, late, absent, rate }
    })
  }, [uniqueDates, baseRecords])

  // ── Late Arrivals rows ────────────────────────────────────────────────────
  const lateRows = useMemo(() => {
    return baseRecords
      .filter(r => r.status === 'late')
      .map(r => {
        const att  = attendees.find(a => a.id === r.attendee_id)
        const proj = projects.find(p => p.id === r.project_id)
        const [h, m] = (r.join_time ?? '').split(':').map(Number)
        const fmt = r.join_time ? `${h % 12 || 12}:${String(m).padStart(2, '0')} ${h >= 12 ? 'PM' : 'AM'}` : '—'
        return { date: r.date, attendee: att?.name ?? '—', emp_id: att?.employee_id ?? '—', project: proj?.name ?? '—', join_time: fmt, minutes_late: r.minutes_late, work_mode: r.work_mode ?? '—' }
      })
      .sort((a, b) => b.minutes_late - a.minutes_late)
  }, [baseRecords, attendees, projects])

  // ── Absent rows ───────────────────────────────────────────────────────────
  const absentRows = useMemo(() => {
    return baseRecords
      .filter(r => r.status === 'absent')
      .map(r => {
        const att  = attendees.find(a => a.id === r.attendee_id)
        const proj = projects.find(p => p.id === r.project_id)
        return { date: r.date, day: new Date(r.date + 'T00:00').toLocaleDateString('en-US', { weekday: 'short' }), attendee: att?.name ?? '—', emp_id: att?.employee_id ?? '—', project: proj?.name ?? '—', notes: r.notes || '—' }
      })
      .sort((a, b) => b.date.localeCompare(a.date))
  }, [baseRecords, attendees, projects])

  // ── WFH rows ──────────────────────────────────────────────────────────────
  const wfhRows = useMemo(() => {
    const totalByAtt: Record<string, { name: string; emp: string; office: number; wfh: number; total: number }> = {}
    baseRecords.filter(r => r.status !== 'absent').forEach(r => {
      const att = attendees.find(a => a.id === r.attendee_id)
      if (!totalByAtt[r.attendee_id]) totalByAtt[r.attendee_id] = { name: att?.name ?? '—', emp: att?.employee_id ?? '—', office: 0, wfh: 0, total: 0 }
      if (r.work_mode === 'office') totalByAtt[r.attendee_id].office++
      if (r.work_mode === 'wfh')    totalByAtt[r.attendee_id].wfh++
      totalByAtt[r.attendee_id].total++
    })
    return Object.values(totalByAtt).map(row => ({
      ...row,
      wfh_pct: row.total > 0 ? Math.round((row.wfh / row.total) * 100) : 0,
    })).sort((a, b) => b.wfh_pct - a.wfh_pct)
  }, [baseRecords, attendees])

  // ── Chart data ────────────────────────────────────────────────────────────
  const chartData = useMemo(() => {
    if (reportType === 'wfh') {
      return wfhRows.slice(0, 8).map(r => ({ name: r.name.split(' ')[0], office: r.office, wfh: r.wfh }))
    }
    return dailyRows.map(r => ({ date: r.date.slice(5), present: r.present, late: r.late, absent: r.absent }))
  }, [reportType, dailyRows, wfhRows])

  // ── Metrics summary ───────────────────────────────────────────────────────
  const summary = useMemo(() => {
    const total   = baseRecords.length
    const present = baseRecords.filter(r => r.status === 'present').length
    const late    = baseRecords.filter(r => r.status === 'late').length
    const absent  = baseRecords.filter(r => r.status === 'absent').length
    const wfh     = baseRecords.filter(r => r.work_mode === 'wfh').length
    return {
      total,
      attendanceRate: total > 0 ? Math.round(((present + late) / total) * 100) : 0,
      lateRate:       total > 0 ? Math.round((late / total) * 100) : 0,
      absentRate:     total > 0 ? Math.round((absent / total) * 100) : 0,
      wfhRate:        (present + late) > 0 ? Math.round((wfh / (present + late)) * 100) : 0,
    }
  }, [baseRecords])

  // ── CSV export ────────────────────────────────────────────────────────────
  function handleExportCSV() {
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
        if (reportOptions.includeNotes) base['Notes'] = (r as any).notes || ''
        return base
      }), `late-arrivals-${fromDate}-to-${toDate}.csv`)
    } else if (reportType === 'absent') {
      downloadCSV(absentRows.map(r => {
        const base: any = { Date: r.date, Day: r.day, Attendee: r.attendee, 'Employee ID': r.emp_id, Project: r.project }
        if (reportOptions.includeNotes) base['Notes'] = r.notes
        return base
      }), `absences-${fromDate}-to-${toDate}.csv`)
    } else {
      downloadCSV(wfhRows.map(r => ({
        Attendee: r.name, 'Employee ID': r.emp, 'Office Days': r.office, 'WFH Days': r.wfh, 'Total Days': r.total, 'WFH %': `${r.wfh_pct}%`,
      })), `wfh-report-${fromDate}-to-${toDate}.csv`)
    }
  }

  const attendeesForFilter = useMemo(() => {
    if (filterProject === 'all') return attendees
    const proj = projects.find(p => p.id === filterProject)
    return attendees.filter(a => a.project === proj?.name)
  }, [attendees, projects, filterProject])

  const chartTitle: Record<ReportType, string> = {
    daily:  'Attendance by Day',
    late:   'Late Arrivals by Day',
    absent: 'Absences by Day',
    wfh:    'WFH vs Office by Attendee',
  }

  return (
    <div className="p-6 min-h-full">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Detailed Reports</h1>
          <p className="text-sm text-gray-400 mt-0.5">Generate and analyze attendance reports</p>
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
          <ShimmerStyle />
          <div className="grid grid-cols-4 gap-4">
            {dataLoading ? (
              <>{[0,1,2,3].map(i => <SkeletonMetricCard key={i} />)}</>
            ) : (
              <>
                {[
                  { label: 'Attendance Rate', value: `${summary.attendanceRate}%`, sub: `${summary.total} records`,    color: 'text-green-600'  },
                  { label: 'Late Rate',       value: `${summary.lateRate}%`,       sub: 'of present+late',              color: 'text-orange-600' },
                  { label: 'Absent Rate',     value: `${summary.absentRate}%`,     sub: 'of all records',               color: 'text-red-600'    },
                  { label: 'WFH Rate',        value: `${summary.wfhRate}%`,        sub: 'of present+late days',         color: 'text-blue-600'   },
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
            <div className="grid grid-cols-4 gap-3">
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
              <button onClick={() => { setFilterProject('all'); setFilterAttendee('all'); setFromDate(() => { const d = new Date(); d.setDate(d.getDate() - 13); return d.toISOString().slice(0, 10) }); setToDate(new Date().toISOString().slice(0, 10)) }}
                className="text-xs text-gray-400 hover:text-gray-600">Clear All</button>
            </div>
            <div className="grid grid-cols-4 gap-4 mb-4">
              <div>
                <label className="block text-xs text-gray-400 mb-1.5">From Date</label>
                <DatePickerPopover value={fromDate} onChange={setFromDate} fullWidth placeholder="From date" />
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1.5">To Date</label>
                <DatePickerPopover value={toDate} onChange={setToDate} fullWidth placeholder="To date" />
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1.5">Project</label>
                <SelectDropdown
                  value={filterProject}
                  onChange={v => { setFilterProject(v); setFilterAttendee('all') }}
                  options={[
                    { value: 'all', label: 'All Projects' },
                    ...projects.map(p => ({ value: p.id, label: p.name }))
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
                    { value: 'all', label: 'All Attendees' },
                    ...attendeesForFilter.map(a => ({ value: a.id, label: a.name }))
                  ]}
                  allowClear
                  className="w-full"
                />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="relative">
                <button className="flex items-center gap-1.5 px-4 py-2 bg-gray-900 text-white text-sm font-medium rounded-xl hover:bg-gray-800 transition-colors">
                  <Play className="w-3.5 h-3.5" /> Generate Report
                </button>
                <button onClick={() => setShowOptionsPopover(s => !s)} className="ml-2 px-3 py-2 border border-gray-200 text-sm rounded-xl text-gray-700 hover:bg-gray-50">
                  Report Options
                </button>
                {showOptionsPopover && (
                  <div className="absolute right-0 mt-10 w-56 bg-white border border-gray-100 rounded-xl shadow-lg p-3 z-50">
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
              </div>
              <button onClick={() => setShowSaveModal(true)} className="flex items-center gap-1.5 px-4 py-2 border border-gray-200 text-sm font-medium text-gray-700 rounded-xl hover:bg-gray-50 transition-colors">
                <Bookmark className="w-3.5 h-3.5" /> Save Preset
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
                {[65,85,50,90,70,80,45,95,60,75].map((pct, i) => (
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
                          <Bar dataKey="office" name="Office" fill="#1f2937" radius={[3,3,0,0]} />
                          <Bar dataKey="wfh"    name="WFH"    fill="#9ca3af" radius={[3,3,0,0]} />
                        </>
                      ) : (
                        <>
                          <Bar dataKey="present" name="Present" fill="#1f2937" radius={[3,3,0,0]} />
                          <Bar dataKey="late"    name="Late"    fill="#f97316" radius={[3,3,0,0]} />
                          <Bar dataKey="absent"  name="Absent"  fill="#e5e7eb" radius={[3,3,0,0]} />
                        </>
                      )}
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                <div className="flex items-center gap-5 mt-2">
                  {reportType === 'wfh'
                    ? [['Office','#1f2937'],['WFH','#9ca3af']].map(([l,c]) => (
                        <div key={l} className="flex items-center gap-1.5 text-xs text-gray-500">
                          <div className="w-3 h-2 rounded-sm" style={{ backgroundColor: c }} />{l}
                        </div>
                      ))
                    : [['Present','#1f2937'],['Late','#f97316'],['Absent','#e5e7eb']].map(([l,c]) => (
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
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
              <div>
                <h2 className="font-semibold text-gray-900">Detailed Data</h2>
                <p className="text-xs text-gray-400">
                  {reportType === 'daily'  && `${dailyRows.length} day records`}
                  {reportType === 'late'   && `${lateRows.length} late arrivals`}
                  {reportType === 'absent' && `${absentRows.length} absences`}
                  {reportType === 'wfh'    && `${wfhRows.length} attendees`}
                  {' '}· {fromDate} to {toDate}
                </p>
              </div>
            </div>

            {/* ── Daily Summary table ── */}
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

            {/* ── Late Arrivals table ── */}
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

            {/* ── Absenteeism table ── */}
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

            {/* ── WFH table ── */}
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
              {[
                { label: 'Export PDF',   sub: 'Print-ready report' },
                { label: 'Export Excel', sub: 'Advanced format' },
              ].map(({ label, sub }) => (
                <button key={label} className="w-full flex items-center gap-3 p-3 border border-gray-100 rounded-lg hover:bg-gray-50 transition-colors text-left opacity-50 cursor-not-allowed">
                  <Download className="w-4 h-4 text-gray-400 shrink-0" />
                  <div>
                    <p className="text-xs font-medium text-gray-900">{label}</p>
                    <p className="text-[10px] text-gray-400">{sub}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Saved Presets */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
              <h3 className="text-sm font-semibold text-gray-900">Saved Presets</h3>
              <div className="flex items-center gap-2">
                <button onClick={() => { setShowSaveModal(true); setPresetName('') }} className="text-gray-400 hover:text-gray-600"><Plus className="w-4 h-4" /></button>
                <button onClick={handleExportPresets} title="Export presets" className="text-gray-400 hover:text-gray-600"><Download className="w-4 h-4" /></button>
                <button onClick={() => importInputRef.current?.click()} title="Import presets" className="text-gray-400 hover:text-gray-600"><Bookmark className="w-4 h-4" /></button>
                <input ref={el => importInputRef.current = el} type="file" accept="application/json" className="hidden" onChange={e => { handleImportPresets(e.target.files?.[0] ?? null); e.currentTarget.value = '' }} />
              </div>
            </div>
            <div className="divide-y divide-gray-50">
              {presets.length === 0 && (
                <div className="px-4 py-3 text-xs text-gray-400">No saved presets. Create one using "Save Preset".</div>
              )}
              {presets.map(p => (
                <div key={p.id} className={`w-full flex items-center justify-between px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 ${isPresetActive(p) ? 'bg-gray-50' : ''}`}>
                  <div className="flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <button onClick={() => handleApplyPreset(p)} className="text-left flex-1 px-2 py-1 text-sm font-medium">{p.name}</button>
                      <button onClick={() => handleSetDefaultPreset(p)} title="Set as default" className={`text-xs px-2 ${defaultPresetId === p.id ? 'text-green-600' : 'text-gray-400'}`}>{defaultPresetId === p.id ? 'Default' : 'Set Default'}</button>
                    </div>
                    <div className="text-[11px] text-gray-400 px-2">{p.reportType} · {p.fromDate}→{p.toDate}</div>
                  </div>
                  <div className="flex items-center gap-1">
                    <button onClick={() => applyPresetFilters(p)} className="text-xs text-gray-500 px-2">Apply Filters</button>
                    <button onClick={() => applyPresetOptions(p)} className="text-xs text-gray-500 px-2">Apply Options</button>
                    <button onClick={() => handleRenamePreset(p)} className="text-xs text-gray-400 px-2">Rename</button>
                    <button onClick={() => handleDeletePreset(p.id)} className="text-xs text-red-500 px-2">Delete</button>
                  </div>
                </div>
              ))}
            </div>
            <div className="px-3 py-2 border-t border-gray-100">
              <div className="flex items-center gap-2 text-xs text-gray-500">
                <button onClick={() => handleSetDefaultPreset(null)} className="px-2 py-1 rounded hover:bg-gray-50">Clear Default</button>
                <div className="text-[11px]">Tip: Click a preset name to apply all settings.</div>
              </div>
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
              <p className="text-xs font-medium text-gray-700">{filterProject === 'all' ? projects.length : 1} project{filterProject === 'all' && projects.length !== 1 ? 's' : ''}</p>
            </div>
          </div>
        </div>
      </div>

      {drillDate && <DrillModal date={drillDate} projectId={filterProject} onClose={() => setDrillDate(null)} />}

      {showSaveModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40" onClick={() => setShowSaveModal(false)}>
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md" onClick={e => e.stopPropagation()}>
            <div className="px-6 py-4 border-b border-gray-100">
              <h3 className="font-semibold text-gray-900">Save Report Preset</h3>
              <p className="text-xs text-gray-400">Save current filters and options for quick reuse.</p>
            </div>
            <div className="p-6 space-y-3">
              <label className="block text-xs text-gray-400 mb-1.5">Preset name</label>
              <input value={presetName} onChange={e => setPresetName(e.target.value)} placeholder="My monthly summary" className="w-full px-3 py-2 border border-gray-200 rounded-lg" />
              <div>
                <p className="text-xs font-medium text-gray-900 mb-1">Include in preset</p>
                <div className="flex gap-2">
                  <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={!!reportOptions.includeChart} onChange={e => setReportOptions(o => ({ ...o, includeChart: e.target.checked }))} /> Chart</label>
                  <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={!!reportOptions.includeDetails} onChange={e => setReportOptions(o => ({ ...o, includeDetails: e.target.checked }))} /> Details</label>
                  <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={!!reportOptions.includeNotes} onChange={e => setReportOptions(o => ({ ...o, includeNotes: e.target.checked }))} /> Notes</label>
                </div>
              </div>
              <div className="flex items-center justify-end gap-2">
                <button onClick={() => { setShowSaveModal(false); setPresetName('') }} className="px-4 py-2 text-sm rounded-lg border border-gray-200">Cancel</button>
                <button onClick={() => handleSavePreset()} className="px-4 py-2 text-sm rounded-lg bg-gray-900 text-white">Save</button>
                <button onClick={() => { handleSavePreset(); setShowSaveModal(false); }} className="px-4 py-2 text-sm rounded-lg bg-green-600 text-white">Save & Close</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
