import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Bell, Settings, Search, RotateCcw, Filter, AlertCircle, AlertTriangle, Info, MoreHorizontal, Users, UserX, Clock, UserCheck, X, Plus } from 'lucide-react'
import NotificationBell from '../components/ui/NotificationBell'
import { useDashboardViewModel } from '../presentation/viewmodels/useDashboardViewModel'
import { useNotifications } from '../hooks/useNotifications'
import type { Attendee, AttendanceEntry, Project, ActionAlert } from '../domain/entities'
import { DatePickerPopover } from '../components/ui/DatePickerPopover'
import { SelectDropdown } from '../components/ui/SelectDropdown'
import { ShimmerStyle, SkeletonMetricCard, SkeletonTableRows, SkeletonLine } from '../components/ui/Skeleton'
import { SectionErrorBoundary } from '../components/ui/ErrorBoundary'
import { ScrumTimesTile } from '../components/ui/ScrumTimesTile'

// ─── helpers ──────────────────────────────────────────────────────────────────

function fmt12(t: string | null) {
  if (!t) return '—'
  const [h, m] = t.split(':').map(Number)
  const p = h >= 12 ? 'PM' : 'AM'
  return `${h % 12 || 12}:${String(m).padStart(2, '0')} ${p}`
}

// ─── Status Badge ─────────────────────────────────────────────────────────────

function StatusBadge({ status, minutesLate = 0 }: { status: string; minutesLate?: number }) {
  if (status === 'present')
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-green-50 text-green-700 border border-green-200">
        <span className="w-1.5 h-1.5 rounded-full bg-green-500" />On Time
      </span>
    )
  if (status === 'late')
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-orange-50 text-orange-700 border border-orange-200">
        <span className="w-1.5 h-1.5 rounded-full bg-orange-500" />Late({minutesLate} min)
      </span>
    )
  return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-red-50 text-red-700 border border-red-200">
      <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
      {status === 'absent' ? 'On Leave' : 'Missing Punch'}
    </span>
  )
}

// ─── Manual Entry Modal ───────────────────────────────────────────────────────

function ManualEntryModal({ onClose, projects, attendees, addManualEntry }: {
  onClose: () => void
  projects: Project[]
  attendees: Attendee[]
  addManualEntry: (entry: AttendanceEntry) => void
}) {
  const [projectId, setProjectId] = useState('')
  const [attendeeId, setAttendeeId] = useState('')
  const [status, setStatus] = useState<'present' | 'late' | 'absent'>('present')
  const [joinTime, setJoinTime] = useState('')
  const [workMode, setWorkMode] = useState<'office' | 'wfh'>('office')
  const [notes, setNotes] = useState('')

  const today = new Date().toISOString().slice(0, 10)
  const activeProj = projects.filter(p => p.status === 'active')
  const projAttendees = attendees.filter(a => {
    const proj = projects.find(p => p.id === projectId)
    return a.project === proj?.name && a.status === 'active'
  })

  function handleSave() {
    if (!projectId || !attendeeId) return
    addManualEntry({
      id: '',
      project_id: projectId,
      attendee_id: attendeeId,
      date: today,
      join_time: status !== 'absent' && joinTime ? joinTime : null,
      status,
      minutes_late: 0,
      work_mode: status !== 'absent' ? workMode : null,
      notes,
      marked_by: 'Admin User',
      marked_at: new Date().toISOString(),
    })
    onClose()
  }

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="font-semibold text-gray-900">Manual Attendance Entry</h2>
          <button onClick={onClose}><X className="w-5 h-5 text-gray-400 hover:text-gray-600" /></button>
        </div>
        <div className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Project</label>
            <SelectDropdown
              value={projectId}
              onChange={v => { setProjectId(v); setAttendeeId('') }}
              options={activeProj.map(p => ({ value: p.id, label: p.name }))}
              placeholder="Select project"
              className="w-full"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Attendee</label>
            <SelectDropdown
              value={attendeeId}
              onChange={setAttendeeId}
              options={projAttendees.map(a => ({ value: a.id, label: `${a.name} (${a.employee_id})` }))}
              placeholder="Select attendee"
              disabled={!projectId}
              className="w-full"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Status</label>
            <div className="flex items-center gap-2">
              {(['present', 'late', 'absent'] as const).map(s => (
                <button key={s} onClick={() => setStatus(s)}
                  className={`flex-1 py-2 rounded-xl text-xs font-medium border transition-all ${
                    status === s
                      ? s === 'present' ? 'bg-green-600 text-white border-green-600'
                        : s === 'late' ? 'bg-orange-500 text-white border-orange-500'
                        : 'bg-red-600 text-white border-red-600'
                      : 'border-gray-200 text-gray-500 hover:bg-gray-50'
                  }`}>
                  {s.charAt(0).toUpperCase() + s.slice(1)}
                </button>
              ))}
            </div>
          </div>
          {status !== 'absent' && (
            <>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Join Time</label>
                  <input type="time" value={joinTime} onChange={e => setJoinTime(e.target.value)}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Work Mode</label>
                  <div className="flex gap-2">
                    {(['office', 'wfh'] as const).map(m => (
                      <button key={m} onClick={() => setWorkMode(m)}
                        className={`flex-1 py-2.5 rounded-xl text-xs font-medium border transition-all ${workMode === m ? 'bg-gray-900 text-white border-gray-900' : 'border-gray-200 text-gray-600 hover:bg-gray-50'}`}>
                        {m === 'office' ? '🏢' : '🏠'}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </>
          )}
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Notes</label>
            <input type="text" value={notes} onChange={e => setNotes(e.target.value)}
              placeholder="Optional..."
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900" />
          </div>
        </div>
        <div className="flex items-center justify-end gap-3 px-6 pb-6">
          <button onClick={onClose} className="px-4 py-2 border border-gray-200 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50">Cancel</button>
          <button onClick={handleSave} disabled={!projectId || !attendeeId}
            className="px-5 py-2 bg-gray-900 text-white rounded-xl text-sm font-semibold hover:bg-gray-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
            Save Entry
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Metric Card ──────────────────────────────────────────────────────────────

const metricIcons = [Users, UserX, Clock, UserCheck]
function MetricCard({ title, count, subtext, trend, trendUp, iconIndex }: {
  title: string; count: number; subtext?: string; trend: string; trendUp: boolean; iconIndex: number
}) {
  const Icon = metricIcons[iconIndex]
  return (
    <div className="bg-white rounded-xl p-5 border border-gray-100 shadow-sm">
      <div className="flex items-start justify-between mb-3">
        <div className="w-9 h-9 bg-gray-100 rounded-lg flex items-center justify-center">
          <Icon className="w-4.5 h-4.5 text-gray-600" size={18} />
        </div>
        <span className={`text-xs font-semibold ${trendUp ? 'text-green-600' : 'text-red-500'}`}>
          {trendUp ? '↑' : '↓'} {trend}
        </span>
      </div>
      <p className="text-[11px] text-gray-400 uppercase tracking-wide font-semibold">{title}</p>
      <p className="text-2xl font-bold text-gray-900 mt-0.5">
        {count}
        {subtext && <span className="text-sm font-normal text-gray-400 ml-1">/ {subtext}</span>}
      </p>
    </div>
  )
}

// ─── Edit Form ────────────────────────────────────────────────────────────────

function EditForm({ record, projects, onSave, onClose }: {
  record: AttendanceEntry
  projects: Project[]
  onSave: (patch: Partial<Omit<AttendanceEntry, 'id'>>) => void
  onClose: () => void
}) {
  const [status,   setStatus]   = useState<'present' | 'late' | 'absent'>(record.status as 'present' | 'late' | 'absent')
  const [joinTime, setJoinTime] = useState(record.join_time ?? '')
  const [workMode, setWorkMode] = useState<'office' | 'wfh' | null>(record.work_mode as 'office' | 'wfh' | null)
  const [notes,    setNotes]    = useState(record.notes ?? '')

  return (
    <div className="p-6 space-y-4">
      <div>
        <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Status</label>
        <div className="flex gap-2">
          {(['present', 'late', 'absent'] as const).map(s => (
            <button key={s} onClick={() => setStatus(s)}
              className={`flex-1 py-2 rounded-xl text-xs font-medium border transition-all ${
                status === s
                  ? s === 'present' ? 'bg-green-600 text-white border-green-600'
                    : s === 'late' ? 'bg-orange-500 text-white border-orange-500'
                    : 'bg-red-600 text-white border-red-600'
                  : 'border-gray-200 text-gray-500 hover:bg-gray-50'
              }`}>
              {s.charAt(0).toUpperCase() + s.slice(1)}
            </button>
          ))}
        </div>
      </div>
      {status !== 'absent' && (
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Join Time</label>
            <input type="time" value={joinTime} onChange={e => setJoinTime(e.target.value)}
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Work Mode</label>
            <div className="flex gap-2">
              {(['office', 'wfh'] as const).map(m => (
                <button key={m} onClick={() => setWorkMode(m)}
                  className={`flex-1 py-2.5 rounded-xl text-xs font-medium border transition-all ${workMode === m ? 'bg-gray-900 text-white border-gray-900' : 'border-gray-200 text-gray-600 hover:bg-gray-50'}`}>
                  {m === 'office' ? '🏢' : '🏠'}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
      <div>
        <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Notes</label>
        <input type="text" value={notes} onChange={e => setNotes(e.target.value)}
          placeholder="Optional..."
          className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900" />
      </div>
      <div className="flex gap-3 pt-1">
        <button onClick={onClose} className="flex-1 py-2 border border-gray-200 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50">Cancel</button>
        <button
          onClick={() => onSave({ status, join_time: status !== 'absent' && joinTime ? joinTime : null, work_mode: status !== 'absent' ? workMode : null, notes })}
          className="flex-1 py-2 bg-gray-900 text-white rounded-xl text-sm font-semibold hover:bg-gray-800 transition-colors"
        >
          Save
        </button>
      </div>
    </div>
  )
}

// ─── Dashboard (with top-level error boundary) ───────────────────────────────

function DashboardInner() {
  const {
    projects, attendees,
    filterDate, setFilterDate, filterProject, setFilterProject,
    filterStatus, setFilterStatus, filterMode, setFilterMode,
    search, setSearch, reset,
    filtered, dateLabel,
    presentCount, lateCount, absentCount, onLeaveCount, wfhCount, officeCount, onWeekendCount, onHolidayCount, total,
    isWeekend, isPublicHoliday, publicHolidayName,
    projectAttendance,
    addManualEntry, updateEntry, removeEntry, exportCSV: handleExportCSV,
    dataLoading,
  } = useDashboardViewModel()

  const navigate = useNavigate()
  const [showManual, setShowManual] = useState(false)
  const today = new Date().toISOString().slice(0, 10)
  const { notifications } = useNotifications()

  // Three-dot action menu
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null)
  const [editRecord, setEditRecord] = useState<typeof filtered[0] | null>(null)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  // Check-in list pagination
  const PAGE_SIZE = 10
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE)
  // Reset to first page whenever the filtered list changes (new filter/search applied)
  useEffect(() => { setVisibleCount(PAGE_SIZE) }, [filtered])

  // Select all / Batch delete
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

  const sortedFiltered = [...filtered].sort((a, b) => {
    const nameA = attendees.find(att => att.id === a.attendee_id)?.name ?? ''
    const nameB = attendees.find(att => att.id === b.attendee_id)?.name ?? ''
    return nameA.localeCompare(nameB)
  })

  const allSelected = selectedIds.size === sortedFiltered.length && sortedFiltered.length > 0
  
  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedIds(new Set(sortedFiltered.map(r => r.id)))
    } else {
      setSelectedIds(new Set())
    }
  }

  const handleSelectRecord = (recordId: string, checked: boolean) => {
    const newSelected = new Set(selectedIds)
    if (checked) {
      newSelected.add(recordId)
    } else {
      newSelected.delete(recordId)
    }
    setSelectedIds(newSelected)
  }

  const handleDeleteSelected = () => {
    selectedIds.forEach(id => removeEntry(id))
    setSelectedIds(new Set())
    setShowDeleteConfirm(false)
  }
  const visibleRecords = sortedFiltered.slice(0, visibleCount)
  const hasMore = visibleCount < sortedFiltered.length

  return (
    <div className="px-6 pb-6 pt-0 min-h-full">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Today's Overview</h1>
          <p className="text-sm text-gray-400 mt-0.5">{dateLabel}</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input type="text" value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search attendees..."
              className="pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-200 w-52 bg-white" />
          </div>
          <div className="relative">
            <NotificationBell />
          </div>
          <button onClick={() => navigate('/settings')} className="w-9 h-9 flex items-center justify-center rounded-lg border border-gray-200 bg-white hover:bg-gray-50" title="Settings">
            <Settings className="w-4 h-4 text-gray-500" />
          </button>
        </div>
      </div>

      {/* Weekend Banner */}
      {isWeekend && (
        <div className="bg-blue-50 border border-blue-300 rounded-lg p-4 text-blue-900 font-semibold flex items-center gap-3 mb-6">
          <span className="text-2xl">📅</span>
          <div>
            <p>Weekend - No attendance tracking today</p>
            <p className="text-sm font-normal text-blue-700">All team members are off</p>
          </div>
        </div>
      )}

      {/* Public Holiday Banner */}
      {isPublicHoliday && (
        <div className="bg-amber-50 border border-amber-300 rounded-lg p-4 text-amber-900 font-semibold flex items-center gap-3 mb-6">
          <span className="text-2xl">🎉</span>
          <div>
            <p>{publicHolidayName} - Public Holiday</p>
            <p className="text-sm font-normal text-amber-700">No attendance tracking today</p>
          </div>
        </div>
      )}

      {/* Metric cards */}
      <ShimmerStyle />
      <SectionErrorBoundary label="Metric Cards">
      <div className="grid grid-cols-4 gap-4 mb-6">
        {dataLoading ? (
          <>{[0,1,2,3].map(i => <SkeletonMetricCard key={i} />)}</>
        ) : (
          <>
            <MetricCard title="Present Today"  count={presentCount} subtext={String(total)} trend="12%" trendUp={true}  iconIndex={0} />
            <MetricCard title="On Leave"       count={absentCount}                           trend="0%"  trendUp={false} iconIndex={1} />
            <MetricCard title="Late Arrivals"  count={lateCount}                             trend="5%"  trendUp={true}  iconIndex={2} />
            <MetricCard title="Work Mode"      count={wfhCount + officeCount}                trend="0%"  trendUp={false} iconIndex={3} subtext={`WFH: ${wfhCount} | Office: ${officeCount}`} />
          </>
        )}
      </div>
      </SectionErrorBoundary>

      {/* Filters */}
      <SectionErrorBoundary label="Filters">
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm mb-6">
        {/* Filter bar header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100 bg-gray-50/60">
          <div className="flex items-center gap-2">
            <Filter className="w-3.5 h-3.5 text-gray-400" />
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Filters</span>
            {(filterDate !== today || filterProject || filterStatus || filterMode) && (
              <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-gray-900 text-white">Active</span>
            )}
          </div>
          <button onClick={reset} className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-700 transition-colors">
            <RotateCcw className="w-3 h-3" /> Reset
          </button>
        </div>

        {/* Filter controls */}
        <div className="px-5 py-4 flex items-end gap-4 flex-wrap">

          {/* Date */}
          <div className="flex flex-col gap-1.5">
            <label className="flex items-center gap-1 text-[10px] font-bold text-gray-400 uppercase tracking-widest">
              <span>📅</span> Date
            </label>
            <DatePickerPopover value={filterDate} onChange={setFilterDate} />
          </div>

          {/* Project pill selector */}
          <div className="flex flex-col gap-1.5">
            <label className="flex items-center gap-1 text-[10px] font-bold text-gray-400 uppercase tracking-widest">
              <span>🗂️</span> Project
            </label>
            <div className="flex items-center gap-1.5 flex-wrap">
              {[{ id: '', name: 'All' }, ...projects.filter(p => p.status === 'active')].map(p => (
                <button
                  key={p.id}
                  onClick={() => setFilterProject(p.id)}
                  className={`h-9 px-3.5 rounded-xl text-xs font-semibold border transition-all whitespace-nowrap
                    ${filterProject === p.id
                      ? 'bg-gray-900 text-white border-gray-900 shadow-sm'
                      : 'bg-white text-gray-600 border-gray-200 hover:border-gray-400 hover:text-gray-900'}`}
                >
                  {p.name}
                </button>
              ))}
            </div>
          </div>

          {/* Work Mode pill selector */}
          <div className="flex flex-col gap-1.5">
            <label className="flex items-center gap-1 text-[10px] font-bold text-gray-400 uppercase tracking-widest">
              <span>💼</span> Work Mode
            </label>
            <div className="flex items-center gap-1.5 p-1 bg-gray-100 rounded-xl">
              {[
                { value: '',       label: 'All',    emoji: '🌐' },
                { value: 'office', label: 'Office', emoji: '🏢' },
                { value: 'wfh',    label: 'WFH', emoji: '🏠' },
              ].map(opt => (
                <button
                  key={opt.value}
                  onClick={() => setFilterMode(opt.value)}
                  className={`flex items-center gap-1.5 h-7 px-3 rounded-lg text-xs font-semibold transition-all
                    ${filterMode === opt.value
                      ? 'bg-white text-gray-900 shadow-sm'
                      : 'text-gray-500 hover:text-gray-700'}`}
                >
                  <span>{opt.emoji}</span> {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Status pill selector */}
          <div className="flex flex-col gap-1.5">
            <label className="flex items-center gap-1 text-[10px] font-bold text-gray-400 uppercase tracking-widest">
              <span>🔖</span> Status
            </label>
            <div className="flex items-center gap-1.5">
              {[
                { value: '',        label: 'All',     cls: filterStatus === '' ? 'bg-gray-900 text-white border-gray-900' : 'bg-white text-gray-600 border-gray-200 hover:border-gray-400' },
                { value: 'present', label: '✅ Present', cls: filterStatus === 'present' ? 'bg-green-600 text-white border-green-600' : 'bg-white text-gray-600 border-gray-200 hover:border-green-400 hover:text-green-700' },
                { value: 'late',    label: '⏰ Late',    cls: filterStatus === 'late'    ? 'bg-orange-500 text-white border-orange-500' : 'bg-white text-gray-600 border-gray-200 hover:border-orange-400 hover:text-orange-700' },
                { value: 'absent',  label: '📋 On Leave',  cls: filterStatus === 'absent'  ? 'bg-purple-600 text-white border-purple-600'     : 'bg-white text-gray-600 border-gray-200 hover:border-purple-400 hover:text-purple-700' },
              ].map(opt => (
                <button
                  key={opt.value}
                  onClick={() => setFilterStatus(opt.value)}
                  className={`h-9 px-3.5 rounded-xl text-xs font-semibold border transition-all shadow-sm ${opt.cls}`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

        </div>
      </div>
      </SectionErrorBoundary>

      {/* Two-column content */}
      <div className="flex gap-5">
        {/* Recent Check-ins */}
        <SectionErrorBoundary label="Check-ins Table" className="flex-1">
        <div className="flex-1 bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
            <div>
              <h2 className="font-semibold text-gray-900">Check-ins</h2>
              <p className="text-xs text-gray-400 mt-0.5">
                {filtered.length} records{filterDate !== today ? ` for ${filterDate}` : ' for today'}
              </p>
            </div>
            <div className="flex items-center gap-2">
              {selectedIds.size > 0 && (
                <button
                  onClick={() => setShowDeleteConfirm(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-red-50 text-red-600 rounded-lg text-xs font-medium hover:bg-red-100 border border-red-200"
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                  Delete ({selectedIds.size})
                </button>
              )}
              <button onClick={handleExportCSV} className="flex items-center gap-1.5 px-3 py-1.5 border border-gray-200 rounded-lg text-xs font-medium text-gray-600 hover:bg-gray-50">
                ↑ Export CSV
              </button>
              <button
                onClick={() => setShowManual(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-900 text-white rounded-lg text-xs font-medium hover:bg-gray-800"
              >
                <Plus className="w-3 h-3" /> Manual Entry
              </button>
            </div>
          </div>
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100">
                <th key="select" className="px-5 py-3 text-left">
                  <input
                    type="checkbox"
                    checked={allSelected}
                    onChange={e => handleSelectAll(e.target.checked)}
                    className="w-4 h-4 rounded border-gray-300 text-gray-900 cursor-pointer"
                  />
                </th>
                {['ATTENDEE', 'TIME & PROJECT', 'WORK MODE', 'STATUS', 'ACTION'].map(col => (
                  <th key={col} className="px-5 py-3 text-left text-[11px] font-semibold text-gray-400 uppercase tracking-wider">{col}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {dataLoading ? (
                <SkeletonTableRows rows={5} cols={5} />
              ) : visibleRecords.map(record => {
                const att  = attendees.find(a => a.id === record.attendee_id)
                const proj = projects.find(p => p.id === record.project_id)
                if (!att) return null
                const isSelected = selectedIds.has(record.id)
                return (
                  <tr key={record.id} className={`hover:bg-gray-50/60 transition-colors ${isSelected ? 'bg-blue-50' : ''}`}>
                    <td className="px-5 py-3.5">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={e => handleSelectRecord(record.id, e.target.checked)}
                        className="w-4 h-4 rounded border-gray-300 text-gray-900 cursor-pointer"
                      />
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-xs font-bold text-gray-600 shrink-0">
                          {att.name.split(' ').map(n => n[0]).join('')}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-900">{att.name}</p>
                          <p className="text-xs text-gray-400">{att.employee_id}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-3.5">
                      <p className="text-sm text-gray-900">{fmt12(record.join_time)}</p>
                      <p className="text-xs text-gray-400">{proj?.name ?? '—'}</p>
                    </td>
                    <td className="px-5 py-3.5">
                      {record.work_mode ? (
                        <span className="text-sm text-gray-700">
                          {record.work_mode === 'office' ? '🏢 Office' : '🏠 WFH'}
                        </span>
                      ) : <span className="text-xs text-gray-300">—</span>}
                    </td>
                    <td className="px-5 py-3.5">
                      <StatusBadge status={record.status} minutesLate={record.minutes_late} />
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="relative">
                        <button
                          onClick={() => setMenuOpenId(menuOpenId === record.id ? null : record.id)}
                          className="text-gray-300 hover:text-gray-700 transition-colors p-1 rounded-lg hover:bg-gray-100"
                        >
                          <MoreHorizontal className="w-4 h-4" />
                        </button>
                        {menuOpenId === record.id && (
                          <div className="absolute right-0 top-8 z-50 bg-white rounded-xl shadow-xl border border-gray-100 py-1 w-36">
                            <button
                              onClick={() => { setEditRecord(record); setMenuOpenId(null) }}
                              className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                            >
                              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                              Edit
                            </button>
                            <button
                              onClick={() => { setDeleteId(record.id); setMenuOpenId(null) }}
                              className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
                            >
                              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                              Delete
                            </button>
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
          {!dataLoading && filtered.length === 0 && (
            <div className="py-12 text-center">
              <Filter className="w-8 h-8 text-gray-200 mx-auto mb-2" />
              <p className="text-gray-400 text-sm">No records match the current filters.</p>
              <button onClick={reset} className="mt-2 text-xs text-gray-500 underline">Reset filters</button>
            </div>
          )}
          <div className="flex items-center justify-between px-5 py-3 border-t border-gray-100">
              <span className="text-xs text-gray-400">
                Showing <strong className="text-gray-700">{Math.min(visibleCount, sortedFiltered.length)}</strong> of <strong className="text-gray-700">{sortedFiltered.length}</strong>
              </span>
              <div className="flex items-center gap-3">
                {hasMore && (
                  <button
                    onClick={() => setVisibleCount(v => v + PAGE_SIZE)}
                    className="text-xs text-blue-600 hover:text-blue-700 font-medium"
                  >
                    Load More ({sortedFiltered.length - visibleCount} remaining)
                  </button>
                )}
                {visibleCount > PAGE_SIZE && (
                  <button
                    onClick={() => setVisibleCount(PAGE_SIZE)}
                    className="text-xs text-gray-400 hover:text-gray-600 font-medium"
                  >
                    Show Less
                  </button>
                )}
              </div>
            </div>
        </div>
        </SectionErrorBoundary>

        {/* Right panel */}
        <div className="w-64 shrink-0 flex flex-col gap-4">
          {/* Action Required */}
          <SectionErrorBoundary label="Action Required">
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
              <h3 className="text-sm font-semibold text-gray-900">Action Required</h3>
              <button onClick={() => navigate('/settings?tab=notifications')} className="text-xs text-gray-400 hover:text-gray-600 transition-colors">View All</button>
            </div>
            <div className="divide-y divide-gray-50">
              {notifications.slice(0, 5).map((alert) => {
                const Icon = alert.alert_type === 'attendance_reminder' ? AlertCircle : alert.alert_type === 'late_arrival' ? AlertTriangle : Info
                const colorMap: Record<string, string> = {
                  attendance_reminder: 'text-red-500 bg-red-50',
                  late_arrival: 'text-orange-500 bg-orange-50',
                  default: 'text-blue-500 bg-blue-50',
                }
                return (
                  <div key={alert.id} className="p-3 flex gap-3 hover:bg-gray-50/60 transition-colors">
                    <div className={`w-6 h-6 rounded flex items-center justify-center shrink-0 mt-0.5 ${colorMap[alert.alert_type] || colorMap.default}`}>
                      <Icon className="w-3.5 h-3.5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-gray-900">{alert.title}</p>
                      <p className="text-[11px] text-gray-500 mt-0.5 leading-relaxed">{alert.message}</p>
                      <p className="text-[10px] text-gray-300 mt-1">{new Date(alert.created_at).toLocaleString()}</p>
                    </div>
                  </div>
                )
              })}
              {notifications.length === 0 && (
                <div className="py-8 text-center text-gray-400">
                  <Info className="w-6 h-6 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No action required</p>
                </div>
              )}
            </div>
          </div>
          </SectionErrorBoundary>

          {/* Attendance by Project */}
          <SectionErrorBoundary label="Attendance by Project">
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
              <h3 className="text-sm font-semibold text-gray-900">Attendance by Project</h3>
              <button className="text-gray-300 hover:text-gray-500"><MoreHorizontal className="w-4 h-4" /></button>
            </div>
            <div className="p-4 space-y-3.5">
              {projectAttendance.map(item => (
                <div key={item.project}>
                  <div className="flex items-center justify-between text-xs mb-1.5">
                    <span className="font-medium text-gray-700">{item.project}</span>
                    <span className="text-gray-500">{item.total > 0 ? Math.round(((item.present + item.late) / item.total) * 100) : 0}%</span>
                  </div>
                  <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div className="h-full bg-gray-900 rounded-full transition-all duration-500" style={{ width: `${item.total > 0 ? Math.round(((item.present + item.late) / item.total) * 100) : 0}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
          </SectionErrorBoundary>

          {/* Scrum Times */}
          <SectionErrorBoundary label="Scrum Times">
            <ScrumTimesTile projects={projects.filter(p => p.status === 'active')} />
          </SectionErrorBoundary>
        </div>
      </div>

      {showManual && (
        <ManualEntryModal
          onClose={() => setShowManual(false)}
          projects={projects}
          attendees={attendees}
          addManualEntry={addManualEntry}
        />
      )}

      {/* Edit attendance modal */}
      {editRecord && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={() => setEditRecord(null)}>
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h2 className="font-semibold text-gray-900">Edit Attendance</h2>
              <button onClick={() => setEditRecord(null)}><X className="w-5 h-5 text-gray-400 hover:text-gray-600" /></button>
            </div>
            <EditForm
              record={editRecord}
              projects={projects}
              onSave={(patch) => { updateEntry(editRecord.id, patch); setEditRecord(null) }}
              onClose={() => setEditRecord(null)}
            />
          </div>
        </div>
      )}

      {/* Delete confirm */}
      {deleteId && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={() => setDeleteId(null)}>
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-xs p-6 text-center" onClick={e => e.stopPropagation()}>
            <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <X className="w-5 h-5 text-red-600" />
            </div>
            <h2 className="font-semibold text-gray-900 mb-2">Delete Record?</h2>
            <p className="text-sm text-gray-500 mb-5">This attendance record will be permanently deleted.</p>
            <div className="flex gap-3">
              <button onClick={() => setDeleteId(null)} className="flex-1 py-2 border border-gray-200 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50">Cancel</button>
              <button onClick={() => { removeEntry(deleteId); setDeleteId(null) }} className="flex-1 py-2 bg-red-600 text-white rounded-xl text-sm font-semibold hover:bg-red-700 transition-colors">Delete</button>
            </div>
          </div>
        </div>
      )}

      {/* Delete selected confirm */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={() => setShowDeleteConfirm(false)}>
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-xs p-6 text-center" onClick={e => e.stopPropagation()}>
            <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
            </div>
            <h2 className="font-semibold text-gray-900 mb-2">Delete {selectedIds.size} Record{selectedIds.size !== 1 ? 's' : ''}?</h2>
            <p className="text-sm text-gray-500 mb-5">These attendance records will be permanently deleted and cannot be recovered.</p>
            <div className="flex gap-3">
              <button onClick={() => setShowDeleteConfirm(false)} className="flex-1 py-2 border border-gray-200 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50">Cancel</button>
              <button onClick={handleDeleteSelected} className="flex-1 py-2 bg-red-600 text-white rounded-xl text-sm font-semibold hover:bg-red-700 transition-colors">Delete All</button>
            </div>
          </div>
        </div>
      )}

      {/* Click-outside to close action menu */}
      {menuOpenId && <div className="fixed inset-0 z-40" onClick={() => setMenuOpenId(null)} />}
    </div>
  )
}

export default function DashboardScreen() {
  return (
    <SectionErrorBoundary
      label="Dashboard"
      fallback={
        <div className="flex flex-col items-center justify-center h-full gap-4 text-gray-400">
          <span className="text-4xl">⚠️</span>
          <p className="text-sm font-semibold">Dashboard failed to load</p>
          <p className="text-xs text-gray-400">Check the browser console for details.</p>
          <button
            onClick={() => window.location.reload()}
            className="mt-2 px-4 py-2 bg-gray-900 text-white text-sm rounded-xl hover:bg-gray-800"
          >
            Reload Page
          </button>
        </div>
      }
    >
      <DashboardInner />
    </SectionErrorBoundary>
  )
}
