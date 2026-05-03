import { useState, useMemo, useEffect, useRef } from 'react'
import { ChevronLeft, Check, X, Save, AlertTriangle, CheckCircle2, Clock, Flag } from 'lucide-react'
import { useMarkAttendanceData } from '../presentation/viewmodels/useMarkAttendanceViewModel'
import { useBlockerViewModel } from '../presentation/viewmodels/useBlockerViewModel'
import type { AttendanceEntry, Blocker } from '../domain/entities'
import { SelectDropdown } from '../components/ui/SelectDropdown'
import { DatePickerPopover } from '../components/ui/DatePickerPopover'
import { ShimmerStyle, SkeletonLine } from '../components/ui/Skeleton'
import { SupabaseScrumSessionRepository, SupabaseAttendanceRuleRepository } from '../data/repositories/ScrumSessionRepository'

// ─── Helpers ──────────────────────────────────────────────────────────────────

function computeLate(joinTime: string, scrumTime: string, graceMins: number) {
  if (!joinTime) return { status: 'present' as const, minutesLate: 0 }
  const [sh, sm] = scrumTime.split(':').map(Number)
  const [jh, jm] = joinTime.split(':').map(Number)
  const scrumTotal = sh * 60 + sm + graceMins
  const joinTotal  = jh * 60 + jm
  const diff = joinTotal - scrumTotal
  if (diff > 0) return { status: 'late' as const, minutesLate: diff }
  return { status: 'present' as const, minutesLate: 0 }
}

function fmt12(t: string | null) {
  if (!t) return '—'
  const [h, m] = t.split(':').map(Number)
  const p = h >= 12 ? 'PM' : 'AM'
  return `${h % 12 || 12}:${String(m).padStart(2, '0')} ${p}`
}

function getCurrentTime() {
  const now = new Date()
  const h = String(now.getHours()).padStart(2, '0')
  const m = String(now.getMinutes()).padStart(2, '0')
  return `${h}:${m}`
}

// ─── Row type ─────────────────────────────────────────────────────────────────

interface MarkRow {
  attendee_id: string
  name: string
  employee_id: string
  role: string
  status: 'present' | 'late' | 'absent' | 'unmarked'
  work_mode: 'office' | 'wfh' | null
  join_time: string
  notes: string
  minutes_late: number
  blocker?: Blocker | null
}

const STATUS_ACTIVE = {
  present: 'bg-green-100 text-green-700 border-green-300',
  late:    'bg-orange-100 text-orange-700 border-orange-300',
  absent:  'bg-red-100 text-red-700 border-red-300',
  unmarked:'bg-gray-100 text-gray-500 border-gray-200',
}

const STATUS_LABELS = {
  present: 'Present',
  late:    'Late',
  absent:  'On Leave',
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function MarkAttendanceScreen() {
  const { projects, attendees, getAttendanceForDate, saveAttendance, holidays, dataLoading } = useMarkAttendanceData()
  const blockerVM = useBlockerViewModel()

  // Refs for time inputs
  const scrumStartInputRef = useRef<HTMLInputElement>(null)
  const scrumEndInputRef = useRef<HTMLInputElement>(null)

  const [step, setStep]           = useState<1 | 2>(1)
  const [projectId, setProjectId] = useState('')
  const [date, setDate]           = useState(new Date().toISOString().slice(0, 10))
  const [scrumTime, setScrumTime] = useState('')
  const [scrumEndTime, setScrumEndTime] = useState('')
  const [editingStartTime, setEditingStartTime] = useState(false)
  const [editingEndTime, setEditingEndTime] = useState(false)
  const [showSaveConfirm, setShowSaveConfirm] = useState(false)
  const [rows, setRows]           = useState<MarkRow[]>([])
  const [saved, setSaved]         = useState(false)
  const [defaultMode, setDefaultMode] = useState<'office' | 'wfh'>('office')
  const [openBlockerId, setOpenBlockerId] = useState<string | null>(null)
  const [blockerForm, setBlockerForm] = useState<{
    description: string
    severity: 'critical' | 'high' | 'medium' | 'low'
  }>({
    description: '',
    severity: 'high',
  })

  const activeProjects  = projects.filter(p => p.status === 'active')
  const selectedProject = projects.find(p => p.id === projectId)
  const holiday = holidays.find(h => h.project_id === projectId && h.holiday_date === date)

  // Auto-set scrum end time when modal opens
  useEffect(() => {
    if (showSaveConfirm && !scrumEndTime) {
      setScrumEndTime(getCurrentTime())
    }
  }, [showSaveConfirm])

  // Step 1 → Step 2: load attendees
  function loadAttendees() {
    if (!projectId || !selectedProject) return
    const proj = selectedProject
    const projAttendees = attendees.filter(
      a => a.project === proj.name && a.status === 'active'
    )
    const existing = getAttendanceForDate(projectId, date)
    const initial: MarkRow[] = projAttendees.map(a => {
      const ex = existing.find(e => e.attendee_id === a.id)
      // Get open blocker for this attendee (only one at a time displayed)
      const openBlockers = blockerVM.getOpenBlockers(projectId, a.id)
      const blocker = openBlockers.length > 0 ? openBlockers[0] : null
      return {
        attendee_id: a.id,
        name:        a.name,
        employee_id: a.employee_id,
        role:        a.role,
        status:      ex?.status ?? 'unmarked',
        work_mode:   ex?.work_mode ?? null,
        join_time:   ex?.join_time ?? '10:15',
        notes:       ex?.notes ?? '',
        minutes_late:ex?.minutes_late ?? 0,
        blocker:     blocker,
      }
    })
    setRows(initial)
    setSaved(false)
    setStep(2)
  }

  // Update a single row with auto-late computation
  function updateRow(idx: number, updates: Partial<MarkRow>) {
    setRows(prev => {
      const next = [...prev]
      const row = { ...next[idx], ...updates }

      if (updates.join_time !== undefined && scrumTime && row.status !== 'absent') {
        if (updates.join_time) {
          const { status, minutesLate } = computeLate(
            updates.join_time, scrumTime, selectedProject?.late_grace_minutes ?? 0
          )
          row.status       = status
          row.minutes_late = minutesLate
        }
      }

      if (updates.status === 'absent') {
        row.join_time    = ''
        row.work_mode    = null
        row.minutes_late = 0
        row.notes = 'On Leave'
      }
      if (updates.status === 'late') {
        row.notes = 'Scrum not joined'
      }
      if ((updates.status === 'present' || updates.status === 'late') && !row.work_mode) {
        row.work_mode = defaultMode
      }

      next[idx] = row
      return next
    })
  }

  // Bulk actions
  function markAll(status: 'present' | 'absent') {
    setRows(prev => prev.map(r => ({
      ...r,
      status,
      work_mode:    status === 'absent' ? null : defaultMode,
      join_time:    status === 'absent' ? '' : r.join_time,
      minutes_late: 0,
      notes:        status === 'absent' ? 'On Leave' : '',
    })))
  }

  function applyDefaultMode(mode: 'office' | 'wfh') {
    setDefaultMode(mode)
    setRows(prev => prev.map(r => ({
      ...r,
      work_mode: r.status === 'absent' ? null : mode,
    })))
  }

  const counts = useMemo(() => ({
    present:  rows.filter(r => r.status === 'present').length,
    late:     rows.filter(r => r.status === 'late').length,
    absent:   rows.filter(r => r.status === 'absent').length,
    unmarked: rows.filter(r => r.status === 'unmarked').length,
  }), [rows])

  function handleSave() {
    setShowSaveConfirm(true)
  }

  function confirmAndSave() {
    if (!selectedProject) return
    const entries: AttendanceEntry[] = rows.map(row => ({
      id:           '',
      project_id:   projectId,
      attendee_id:  row.attendee_id,
      date,
      join_time:    row.status !== 'absent' && row.join_time ? row.join_time : null,
      status:       row.status === 'unmarked' ? 'absent' : row.status,
      minutes_late: row.minutes_late,
      work_mode:    row.work_mode,
      notes:        row.notes,
      marked_by:    'Admin User',
      marked_at:    new Date().toISOString(),
    }))
    
    // Save attendance entries
    saveAttendance(entries)
    
    // Save scrum times and attendance rules
    const scrumSessionRepo = new SupabaseScrumSessionRepository()
    const attendanceRuleRepo = new SupabaseAttendanceRuleRepository()
    
    Promise.all([
      scrumSessionRepo.saveScrumSession(projectId, date, scrumTime, scrumEndTime),
      attendanceRuleRepo.saveAttendanceRule(projectId, scrumTime, scrumEndTime, selectedProject.late_grace_minutes, selectedProject.scrum_timezone),
    ]).catch(err => console.error('Failed to save scrum times:', err))
    
    setSaved(true)
    setShowSaveConfirm(false)
  }

  const dateLabel = new Date(date + 'T00:00:00').toLocaleDateString('en-US', {
    weekday: 'long', month: 'long', day: 'numeric', year: 'numeric',
  })

  // ─── Step 1 ────────────────────────────────────────────────────────────────
  if (step === 1) {
    return (
      <div className="p-6 max-w-xl mx-auto">
        <ShimmerStyle />
        <h1 className="text-2xl font-bold text-gray-900 mb-1">Mark Attendance</h1>
        <p className="text-sm text-gray-400 mb-8">Select a project and date to begin marking</p>

        {dataLoading ? (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8 space-y-6">
            <div className="space-y-2">
              <SkeletonLine width="w-16" height="h-3" className="mb-3" />
              <SkeletonLine width="w-full" height="h-10" rounded="rounded-xl" />
            </div>
            <div className="space-y-2">
              <SkeletonLine width="w-12" height="h-3" className="mb-3" />
              <SkeletonLine width="w-full" height="h-10" rounded="rounded-xl" />
            </div>
            <SkeletonLine width="w-full" height="h-12" rounded="rounded-xl" />
          </div>
        ) : (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8 space-y-6">
          {/* Project selector */}
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
              Project
            </label>
            <SelectDropdown
              value={projectId}
              onChange={pid => {
                setProjectId(pid)
                setScrumTime(getCurrentTime())
              }}
              options={activeProjects.map(p => ({ value: p.id, label: `${p.name} · ${p.description}` }))}
              placeholder="— Select a project —"
              className="w-full"
            />
          </div>

          {/* Project info card */}
          {selectedProject && (
            <div className="bg-gray-50 rounded-xl p-4 grid grid-cols-3 gap-4 text-sm">
              <div>
                <p className="text-xs text-gray-400 mb-0.5">Scrum Time</p>
                <p className="font-semibold text-gray-900">{fmt12(selectedProject.scrum_time)}</p>
              </div>
              <div>
                <p className="text-xs text-gray-400 mb-0.5">Timezone</p>
                <p className="font-semibold text-gray-900">{selectedProject.scrum_timezone}</p>
              </div>
              <div>
                <p className="text-xs text-gray-400 mb-0.5">Grace Period</p>
                <p className="font-semibold text-gray-900">{selectedProject.late_grace_minutes} min</p>
              </div>
            </div>
          )}

          {/* Date picker */}
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
              Date
            </label>
            <DatePickerPopover value={date} onChange={setDate} fullWidth />
          </div>

          {/* Scrum Time picker */}
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
              Scrum Started
            </label>
            {editingStartTime ? (
              <div className="flex items-center gap-3 p-4 bg-yellow-50 rounded-xl border-2 border-yellow-400">
                <Clock className="w-5 h-5 text-yellow-600 shrink-0" />
                <input
                  ref={scrumStartInputRef}
                  type="time"
                  value={scrumTime}
                  onChange={e => setScrumTime(e.target.value)}
                  autoFocus
                  className="flex-1 px-3 py-2 border border-yellow-400 rounded-lg text-lg font-bold text-yellow-900 bg-white focus:outline-none focus:ring-2 focus:ring-yellow-600"
                />
                <button
                  type="button"
                  onClick={() => setEditingStartTime(false)}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg text-xs font-medium hover:bg-green-700 transition-colors whitespace-nowrap"
                >
                  Confirm
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-3 p-4 bg-blue-50 rounded-xl border border-blue-200">
                <Clock className="w-5 h-5 text-blue-600 shrink-0" />
                <div className="flex-1">
                  <p className="text-xs text-blue-600 font-medium">Current Time Detected</p>
                  <p className="text-lg font-bold text-blue-900">{fmt12(scrumTime)}</p>
                </div>
                <button
                  type="button"
                  onClick={() => setEditingStartTime(true)}
                  className="px-3 py-2 bg-blue-600 text-white rounded-lg text-xs font-medium hover:bg-blue-700 transition-colors"
                >
                  Edit
                </button>
              </div>
            )}
          </div>

          {/* Holiday warning */}
          {holiday && (
            <div className="flex items-start gap-3 p-4 bg-amber-50 border border-amber-200 rounded-xl">
              <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-amber-800">Holiday: {holiday.name}</p>
                <p className="text-xs text-amber-600 mt-0.5">
                  This date is a holiday for this project. You can still mark attendance if scrum was held.
                </p>
              </div>
            </div>
          )}

          <button
            onClick={loadAttendees}
            disabled={!projectId || dataLoading}
            className="w-full py-3.5 bg-gray-900 text-white font-semibold rounded-xl hover:bg-gray-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
          >
            {dataLoading ? (
              <>
                <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                </svg>
                Loading data…
              </>
            ) : 'Load Attendees →'}
          </button>
        </div>
        )}
      </div>
    )
  }

  // ─── Step 2 ────────────────────────────────────────────────────────────────
  return (
    <div className="p-6">
      {/* Success banner */}
      {saved && (
        <div className="mb-5 flex items-center gap-3 p-4 bg-green-50 border border-green-200 rounded-xl">
          <CheckCircle2 className="w-5 h-5 text-green-600 shrink-0" />
          <div className="flex-1">
            <p className="text-sm font-semibold text-green-800">Attendance saved successfully!</p>
            <p className="text-xs text-green-600 mt-0.5">
              Marked by Admin User at {new Date().toLocaleTimeString()} · {selectedProject?.name} · {dateLabel}
            </p>
          </div>
          <button onClick={() => setSaved(false)} className="text-green-400 hover:text-green-600">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setStep(1)}
            className="w-8 h-8 flex items-center justify-center rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors"
          >
            <ChevronLeft className="w-4 h-4 text-gray-500" />
          </button>
          <div>
            <h1 className="text-xl font-bold text-gray-900">
              {selectedProject?.name} — {dateLabel}
            </h1>
            <p className="text-xs text-gray-400 mt-0.5">
              Scrum at {fmt12(selectedProject?.scrum_time ?? null)} · Grace {selectedProject?.late_grace_minutes}min · Marked by Admin User
            </p>
          </div>
        </div>
        <button
          onClick={handleSave}
          disabled={counts.unmarked > 0}
          className="flex items-center gap-2 px-5 py-2.5 bg-gray-900 text-white font-semibold rounded-xl hover:bg-gray-800 disabled:opacity-40 disabled:cursor-not-allowed text-sm transition-colors"
        >
          <Save className="w-4 h-4" />
          Save Attendance
          {counts.unmarked > 0 && (
            <span className="bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">
              {counts.unmarked}
            </span>
          )}
        </button>
      </div>

      {/* Summary pills */}
      <div className="flex items-center gap-2 mb-4 flex-wrap">
        {[
          { label: 'Present',  count: counts.present,  cls: 'bg-green-100 text-green-700'  },
          { label: 'Late',     count: counts.late,     cls: 'bg-orange-100 text-orange-700'},
          { label: 'On Leave',   count: counts.absent,   cls: 'bg-red-100 text-red-700'      },
          { label: 'Unmarked', count: counts.unmarked, cls: 'bg-gray-100 text-gray-500'    },
        ].map(s => (
          <span key={s.label} className={`px-3 py-1.5 rounded-lg text-xs font-semibold ${s.cls}`}>
            {s.count} {s.label}
          </span>
        ))}
        <span className="ml-2 text-xs text-gray-400">{rows.length} total attendees</span>
      </div>

      {/* Quick actions */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 mb-4 flex items-center gap-3 flex-wrap">
        <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Quick:</span>
        <button
          onClick={() => markAll('present')}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-green-600 text-white rounded-lg text-xs font-medium hover:bg-green-700 transition-colors"
        >
          <Check className="w-3.5 h-3.5" /> Mark All Present
        </button>
        <button
          onClick={() => markAll('absent')}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-red-600 text-white rounded-lg text-xs font-medium hover:bg-red-700 transition-colors"
        >
          <X className="w-3.5 h-3.5" /> Mark All On Leave
        </button>
        <div className="flex items-center gap-2 ml-1">
          <span className="text-xs text-gray-400">Default mode:</span>
          {(['office', 'wfh'] as const).map(mode => (
            <button
              key={mode}
              onClick={() => applyDefaultMode(mode)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                defaultMode === mode
                  ? 'bg-gray-900 text-white border-gray-900'
                  : 'border-gray-200 text-gray-600 hover:bg-gray-50'
              }`}
            >
              {mode === 'office' ? '🏢 Office' : '🏠 WFH'}
            </button>
          ))}
        </div>
      </div>

      {/* Attendance table */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50/50">
              {['Attendee', 'Blocker', 'Status', 'Work Mode', 'Join Time', 'Notes'].map(col => (
                <th key={col} className="px-5 py-3 text-left text-[11px] font-semibold text-gray-400 uppercase tracking-wider">
                  {col}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {rows.map((row, idx) => (
              <tr
                key={row.attendee_id}
                className={`transition-colors ${
                  row.status === 'absent'  ? 'bg-red-50/30'    :
                  row.status === 'late'    ? 'bg-orange-50/30' : 'hover:bg-gray-50/40'
                }`}
              >
                {/* Attendee */}
                <td className="px-5 py-4">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-xs font-bold text-gray-600 shrink-0">
                      {row.name.split(' ').map(n => n[0]).join('')}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">{row.name}</p>
                      <p className="text-xs text-gray-400">{row.employee_id} · {row.role.toUpperCase()}</p>
                    </div>
                  </div>
                </td>

                {/* Blocker */}
                <td className="px-5 py-4">
                  {row.blocker ? (
                    <button
                      onClick={() => setOpenBlockerId(row.attendee_id)}
                      className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-xs font-medium border transition-all ${
                        row.blocker.severity === 'critical'
                          ? 'bg-red-100 text-red-700 border-red-300 hover:ring-2 ring-red-200'
                          : row.blocker.severity === 'high'
                          ? 'bg-orange-100 text-orange-700 border-orange-300 hover:ring-2 ring-orange-200'
                          : row.blocker.severity === 'medium'
                          ? 'bg-yellow-100 text-yellow-700 border-yellow-300 hover:ring-2 ring-yellow-200'
                          : 'bg-blue-100 text-blue-700 border-blue-300 hover:ring-2 ring-blue-200'
                      }`}
                    >
                      <Flag className="w-3 h-3" />
                      {row.blocker.severity.charAt(0).toUpperCase() + row.blocker.severity.slice(1)}
                    </button>
                  ) : (
                    <button
                      onClick={() => setOpenBlockerId(row.attendee_id)}
                      className="px-2.5 py-1.5 text-xs text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                    >
                      + Flag
                    </button>
                  )}
                </td>

                {/* Status */}
                <td className="px-5 py-4">
                  <div className="flex items-center gap-1">
                    {(['present', 'late', 'absent'] as const).map(s => (
                      <button
                        key={s}
                        onClick={() => updateRow(idx, { status: s })}
                        className={`px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                          row.status === s
                            ? STATUS_ACTIVE[s]
                            : 'border-gray-100 text-gray-400 hover:border-gray-300 hover:text-gray-600'
                        }`}
                      >
                        {STATUS_LABELS[s]}
                        {s === 'late' && row.status === 'late' && row.minutes_late > 0 && (
                          <span className="ml-1 text-[10px]">({row.minutes_late}m)</span>
                        )}
                      </button>
                    ))}
                  </div>
                </td>

                {/* Work Mode */}
                <td className="px-5 py-4">
                  {row.status !== 'absent' ? (
                    <div className="flex items-center gap-1">
                      {(['office', 'wfh'] as const).map(mode => (
                        <button
                          key={mode}
                          onClick={() => updateRow(idx, { work_mode: mode })}
                          className={`px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                            row.work_mode === mode
                              ? 'bg-gray-900 text-white border-gray-900'
                              : 'border-gray-200 text-gray-500 hover:bg-gray-50'
                          }`}
                        >
                          {mode === 'office' ? '🏢 Office' : '🏠 WFH'}
                        </button>
                      ))}
                    </div>
                  ) : (
                    <span className="text-xs text-gray-300">—</span>
                  )}
                </td>

                {/* Join Time */}
                <td className="px-5 py-4">
                  {row.status !== 'absent' ? (
                    <div className="flex items-center gap-2">
                      <Clock className="w-3.5 h-3.5 text-gray-300" />
                      <input
                        type="time"
                        value={row.join_time}
                        onChange={e => updateRow(idx, { join_time: e.target.value })}
                        className="border border-gray-200 rounded-lg px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-gray-200 w-28"
                      />
                    </div>
                  ) : (
                    <span className="text-xs text-gray-300">—</span>
                  )}
                </td>

                {/* Notes */}
                <td className="px-5 py-4">
                  <input
                    type="text"
                    value={row.notes}
                    onChange={e => updateRow(idx, { notes: e.target.value })}
                    placeholder="Optional…"
                    className="border border-gray-200 rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-gray-200 w-36 text-gray-700 placeholder-gray-300"
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {rows.length === 0 && (
          <div className="py-16 text-center">
            <p className="text-gray-400 text-sm">No active attendees found for this project.</p>
          </div>
        )}

        {/* Footer */}
        <div className="px-5 py-4 border-t border-gray-100 bg-gray-50/50 flex items-center justify-between">
          <span className="text-xs text-gray-500">
            {rows.length} attendees ·{' '}
            {counts.unmarked > 0
              ? <span className="text-red-500 font-medium">{counts.unmarked} still unmarked</span>
              : <span className="text-green-600 font-medium">All marked ✓</span>
            }
          </span>
          <button
            onClick={handleSave}
            disabled={counts.unmarked > 0}
            className="flex items-center gap-2 px-5 py-2.5 bg-gray-900 text-white font-semibold rounded-xl hover:bg-gray-800 disabled:opacity-40 disabled:cursor-not-allowed text-sm transition-colors"
          >
            <Save className="w-4 h-4" /> Save Attendance
          </button>
        </div>
      </div>

      {/* Blocker Modal */}
      {openBlockerId && (() => {
        const row = rows.find(r => r.attendee_id === openBlockerId)
        const blocker = row?.blocker
        const attendee = row?.name
        const daysOpen = blocker
          ? Math.floor(
              (new Date().getTime() - new Date(blocker.reported_date).getTime()) /
                (1000 * 60 * 60 * 24)
            )
          : 0

        return (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4">
              {/* Header */}
              <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 text-orange-500" />
                  <h2 className="font-semibold text-gray-900">
                    {blocker ? 'Blocker Details' : 'Flag Blocker'}
                  </h2>
                </div>
                <button
                  onClick={() => setOpenBlockerId(null)}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <span className="text-xl">×</span>
                </button>
              </div>

              {/* Content */}
              <div className="px-6 py-4 space-y-4">
                {/* Attendee */}
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1.5">
                    Attendee
                  </label>
                  <p className="text-sm text-gray-900">{attendee}</p>
                </div>

                {blocker ? (
                  <>
                    {/* Description */}
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1.5">
                        Description
                      </label>
                      <p className="text-sm text-gray-700 bg-gray-50 rounded-lg px-3 py-2">
                        {blocker.description}
                      </p>
                    </div>

                    {/* Severity */}
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1.5">
                        Severity
                      </label>
                      <div
                        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border ${
                          blocker.severity === 'critical'
                            ? 'bg-red-100 text-red-700 border-red-300'
                            : blocker.severity === 'high'
                            ? 'bg-orange-100 text-orange-700 border-orange-300'
                            : blocker.severity === 'medium'
                            ? 'bg-yellow-100 text-yellow-700 border-yellow-300'
                            : 'bg-blue-100 text-blue-700 border-blue-300'
                        }`}
                      >
                        <AlertTriangle className="w-3 h-3" />
                        {blocker.severity.charAt(0).toUpperCase() + blocker.severity.slice(1)}
                      </div>
                    </div>

                    {/* Days Open */}
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1.5">
                        Days Open
                      </label>
                      <p className="text-sm text-gray-900 font-semibold">{daysOpen} days</p>
                    </div>

                    {/* Reported Date */}
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1.5">
                        Reported On
                      </label>
                      <p className="text-sm text-gray-700">
                        {new Date(blocker.reported_date).toLocaleDateString()}
                      </p>
                    </div>
                  </>
                ) : (
                  <>
                    {/* Create Mode: Description */}
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1.5">
                        Description
                      </label>
                      <textarea
                        value={blockerForm.description}
                        onChange={e =>
                          setBlockerForm(prev => ({ ...prev, description: e.target.value }))
                        }
                        placeholder="Describe the blocker..."
                        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-700 placeholder-gray-400 resize-none h-20"
                      />
                    </div>

                    {/* Create Mode: Severity */}
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1.5">
                        Severity
                      </label>
                      <div className="flex gap-2">
                        {(['critical', 'high', 'medium', 'low'] as const).map(sev => (
                          <button
                            key={sev}
                            onClick={() =>
                              setBlockerForm(prev => ({ ...prev, severity: sev }))
                            }
                            className={`flex-1 px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                              blockerForm.severity === sev
                                ? sev === 'critical'
                                  ? 'bg-red-100 text-red-700 border-red-300'
                                  : sev === 'high'
                                  ? 'bg-orange-100 text-orange-700 border-orange-300'
                                  : sev === 'medium'
                                  ? 'bg-yellow-100 text-yellow-700 border-yellow-300'
                                  : 'bg-blue-100 text-blue-700 border-blue-300'
                                : 'border-gray-200 text-gray-600 hover:border-gray-300'
                            }`}
                          >
                            {sev.charAt(0).toUpperCase() + sev.slice(1)}
                          </button>
                        ))}
                      </div>
                    </div>
                  </>
                )}
              </div>

              {/* Footer */}
              <div className="px-6 py-4 border-t border-gray-100 bg-gray-50/50 flex items-center gap-3">
                <button
                  onClick={() => setOpenBlockerId(null)}
                  className="flex-1 px-4 py-2.5 border border-gray-200 text-gray-700 font-medium rounded-lg hover:bg-gray-100 transition-colors text-sm"
                >
                  Close
                </button>
                {blocker && (
                  <button
                    onClick={() => {
                      try {
                        blockerVM.resolveBlocker(blocker.id, 'current_user')
                        // Update row locally without full reload
                        setRows(prev =>
                          prev.map(r =>
                            r.attendee_id === openBlockerId
                              ? { ...r, blocker: null }
                              : r,
                          ),
                        )
                        setOpenBlockerId(null)
                      } catch (error) {
                        console.error('Failed to resolve blocker:', error)
                        alert('Failed to resolve blocker')
                      }
                    }}
                    className="flex-1 px-4 py-2.5 bg-green-600 text-white font-medium rounded-lg hover:bg-green-700 transition-colors text-sm"
                  >
                    Mark Resolved
                  </button>
                )}
                {!blocker && (
                  <button
                    onClick={() => {
                      if (!blockerForm.description.trim()) {
                        alert('Please enter a blocker description')
                        return
                      }
                      try {
                        const newBlocker = blockerVM.createBlocker({
                          projectId,
                          attendeeId: openBlockerId,
                          description: blockerForm.description,
                          severity: blockerForm.severity,
                        })
                        // Update row locally with new blocker
                        setRows(prev =>
                          prev.map(r =>
                            r.attendee_id === openBlockerId
                              ? { ...r, blocker: newBlocker }
                              : r,
                          ),
                        )
                        // Reset form and close
                        setBlockerForm({ description: '', severity: 'high' })
                        setOpenBlockerId(null)
                      } catch (error) {
                        console.error('Failed to create blocker:', error)
                        alert('Failed to create blocker')
                      }
                    }}
                    className="flex-1 px-4 py-2.5 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors text-sm"
                  >
                    Flag Blocker
                  </button>
                )}
              </div>
            </div>
          </div>
        )
      })()}

      {/* Save Confirmation Modal */}
      {showSaveConfirm && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={() => {
          setShowSaveConfirm(false)
        }}>
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6" onClick={e => e.stopPropagation()}>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                <Clock className="w-6 h-6 text-green-600" />
              </div>
              <h2 className="text-lg font-semibold text-gray-900">Scrum Ended</h2>
            </div>
            <div className="mb-6 p-4 bg-green-50 rounded-xl border border-green-200">
              <p className="text-xs text-green-600 font-medium mb-2">Current Time Detected</p>
              <p className="text-2xl font-bold text-green-900">{fmt12(scrumEndTime || getCurrentTime())}</p>
              <p className="text-xs text-green-600 mt-2">Adjust if needed</p>
            </div>
            {editingEndTime ? (
              <div className="mb-6">
                <div className="flex items-center gap-3 p-4 bg-green-100 rounded-lg border-2 border-green-500">
                  <Clock className="w-4 h-4 text-green-600 shrink-0" />
                  <input
                    ref={scrumEndInputRef}
                    type="time"
                    value={scrumEndTime || getCurrentTime()}
                    onChange={e => setScrumEndTime(e.target.value)}
                    autoFocus
                    className="flex-1 px-3 py-1.5 border border-green-500 rounded-lg font-semibold text-green-900 bg-white focus:outline-none focus:ring-2 focus:ring-green-600"
                  />
                  <button
                    type="button"
                    onClick={() => setEditingEndTime(false)}
                    className="px-4 py-2 bg-green-600 text-white rounded-lg text-xs font-medium hover:bg-green-700 transition-colors whitespace-nowrap"
                  >
                    Confirm
                  </button>
                </div>
              </div>
            ) : (
              <div className="mb-6">
                <button
                  type="button"
                  onClick={() => setEditingEndTime(true)}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors flex items-center justify-center gap-2"
                >
                  <Clock className="w-4 h-4" />
                  Change Time
                </button>
              </div>
            )}
            <div className="flex items-center justify-end gap-3">
              <button
                onClick={() => setShowSaveConfirm(false)}
                className="px-4 py-2 border border-gray-200 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={confirmAndSave}
                className="px-4 py-2 bg-gray-900 text-white rounded-lg text-sm font-semibold hover:bg-gray-800 transition-colors flex items-center gap-2"
              >
                <Save className="w-4 h-4" />
                Save All
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
