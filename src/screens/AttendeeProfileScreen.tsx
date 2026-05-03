import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  ArrowLeft, Edit2, Mail, Briefcase, User, Calendar, TrendingUp,
  Clock, CheckCircle, XCircle, AlertTriangle, Download, ChevronDown, ChevronUp,
} from 'lucide-react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts'
import { useAttendeeProfileViewModel } from '../presentation/viewmodels/useAttendeeProfileViewModel'
import type { Attendee } from '../domain/entities'

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmt12(t: string | null) {
  if (!t) return '—'
  const [h, m] = t.split(':').map(Number)
  return `${h % 12 || 12}:${String(m).padStart(2, '0')} ${h >= 12 ? 'PM' : 'AM'}`
}

function downloadCSV(rows: Record<string, string | number>[], filename: string) {
  if (!rows.length) return
  const headers = Object.keys(rows[0])
  const csv = [headers.join(','), ...rows.map(r => headers.map(h => `"${String(r[h]).replace(/"/g, '""')}"`).join(','))].join('\n')
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a'); a.href = url; a.download = filename; a.click()
  URL.revokeObjectURL(url)
}

// ─── Work Mode Heatmap ────────────────────────────────────────────────────────

const WEEK_COUNT = 26 // ~6 months
const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

function buildHeatmapGrid(heatmapData: Map<string, { work_mode: string | null; status: string }>) {
  // Build a grid of the last WEEK_COUNT weeks, Mon-Sun rows
  const today = new Date()
  // Snap to start of current ISO week (Monday)
  const dow = (today.getDay() + 6) % 7 // 0=Mon, 6=Sun
  const weekStart = new Date(today)
  weekStart.setDate(today.getDate() - dow)

  const weeks: { date: string; work_mode: string | null; status: string | null }[][] = []
  for (let w = WEEK_COUNT - 1; w >= 0; w--) {
    const week: { date: string; work_mode: string | null; status: string | null }[] = []
    for (let d = 0; d < 7; d++) {
      const cell = new Date(weekStart)
      cell.setDate(weekStart.getDate() - w * 7 + d)
      const iso = cell.toISOString().slice(0, 10)
      const rec = heatmapData.get(iso)
      // Future dates: blank
      const isFuture = cell > today
      week.push({
        date: iso,
        work_mode: isFuture ? null : (rec?.work_mode ?? null),
        status: isFuture ? null : (rec?.status ?? null),
      })
    }
    weeks.push(week)
  }
  return weeks
}

function cellColor(cell: { work_mode: string | null; status: string | null }): string {
  if (!cell.status) return 'bg-gray-100'          // no record
  if (cell.status === 'absent') return 'bg-red-200'
  if (cell.work_mode === 'office') return 'bg-gray-800'
  if (cell.work_mode === 'wfh') return 'bg-blue-500'
  return 'bg-green-300'                            // present, no mode recorded
}

function cellLabel(cell: { work_mode: string | null; status: string | null }): string {
  if (!cell.status) return 'No record'
  if (cell.status === 'absent') return 'Absent'
  if (cell.work_mode === 'office') return 'Office'
  if (cell.work_mode === 'wfh') return 'WFH'
  return 'Present'
}

function WorkModeHeatmap({
  heatmapData,
}: {
  heatmapData: Map<string, { work_mode: string | null; status: string }>
}) {
  const weeks = buildHeatmapGrid(heatmapData)

  // Month labels: show month when week contains 1st of month
  const monthLabels: { col: number; label: string }[] = []
  weeks.forEach((week, wi) => {
    const firstDayOfMonth = week.find(c => c.date.endsWith('-01'))
    if (firstDayOfMonth) {
      const d = new Date(firstDayOfMonth.date + 'T00:00')
      monthLabels.push({
        col: wi,
        label: d.toLocaleDateString('en-US', { month: 'short' }),
      })
    }
  })

  const officeDays = [...heatmapData.values()].filter(v => v.work_mode === 'office').length
  const wfhDays    = [...heatmapData.values()].filter(v => v.work_mode === 'wfh').length
  const absentDays = [...heatmapData.values()].filter(v => v.status === 'absent').length

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="font-semibold text-gray-900">Work Mode Heatmap</h2>
          <p className="text-xs text-gray-400">Last 6 months · daily office vs WFH pattern</p>
        </div>
        <div className="flex items-center gap-4 text-xs text-gray-500">
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-sm bg-gray-800 inline-block" /> Office ({officeDays}d)
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-sm bg-blue-500 inline-block" /> WFH ({wfhDays}d)
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-sm bg-red-200 inline-block" /> Absent ({absentDays}d)
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-sm bg-gray-100 inline-block border border-gray-200" /> No record
          </span>
        </div>
      </div>

      {/* Grid */}
      <div className="overflow-x-auto">
        <div className="flex gap-1 min-w-max">
          {/* Day-of-week labels */}
          <div className="flex flex-col gap-1 mr-1 mt-5">
            {DAY_LABELS.map(day => (
              <div key={day} className="h-3.5 flex items-center">
                <span className="text-[9px] text-gray-400 w-6 text-right">{day}</span>
              </div>
            ))}
          </div>

          {/* Week columns */}
          <div className="flex flex-col gap-0">
            {/* Month header row */}
            <div className="flex gap-1 mb-1" style={{ height: '16px' }}>
              {weeks.map((_, wi) => {
                const ml = monthLabels.find(m => m.col === wi)
                return (
                  <div key={wi} className="w-3.5 flex-shrink-0">
                    {ml && (
                      <span className="text-[9px] text-gray-400 whitespace-nowrap">{ml.label}</span>
                    )}
                  </div>
                )
              })}
            </div>

            {/* 7 day rows */}
            {Array.from({ length: 7 }).map((_, di) => (
              <div key={di} className="flex gap-1 mb-1">
                {weeks.map((week, wi) => {
                  const cell = week[di]
                  return (
                    <div
                      key={wi}
                      title={`${cell.date} · ${cellLabel(cell)}`}
                      className={`w-3.5 h-3.5 rounded-sm flex-shrink-0 cursor-default transition-opacity hover:opacity-70 ${cellColor(cell)}`}
                    />
                  )
                })}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Summary bar */}
      {(officeDays + wfhDays) > 0 && (
        <div className="mt-4 pt-4 border-t border-gray-100">
          <div className="flex items-center gap-2 mb-1.5">
            <span className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide">Office vs WFH split</span>
            <span className="ml-auto text-xs font-semibold text-gray-700">
              {Math.round(officeDays / (officeDays + wfhDays) * 100)}% office
            </span>
          </div>
          <div className="h-2 rounded-full overflow-hidden bg-blue-100">
            <div
              className="h-full bg-gray-800 rounded-full transition-all duration-500"
              style={{ width: `${Math.round(officeDays / (officeDays + wfhDays) * 100)}%` }}
            />
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Stat card ────────────────────────────────────────────────────────────────

function StatCard({ label, value, sub, color }: { label: string; value: string | number; sub?: string; color: string }) {
  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
      <p className="text-[11px] text-gray-400 uppercase tracking-wide font-semibold">{label}</p>
      <p className={`text-2xl font-bold mt-1 ${color}`}>{value}</p>
      {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
    </div>
  )
}

// ─── Edit Modal ───────────────────────────────────────────────────────────────

function EditModal({ attendee, projectNames, onSave, onClose }: {
  attendee: Attendee
  projectNames: string[]
  onSave: (d: Partial<Attendee>) => void
  onClose: () => void
}) {
  const [form, setForm] = useState({
    name: attendee.name, email: attendee.email, employee_id: attendee.employee_id,
    role: attendee.role, project: attendee.project, manager: attendee.manager,
    status: attendee.status,
  })
  const F = (key: string, val: string) => setForm(p => ({ ...p, [key]: val }))

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="font-semibold text-gray-900">Edit Profile</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">✕</button>
        </div>
        <div className="p-6 grid grid-cols-2 gap-4">
          {[
            { label: 'Full Name', key: 'name',        type: 'text',  span: 2 },
            { label: 'Employee ID', key: 'employee_id', type: 'text',  span: 1 },
            { label: 'Email', key: 'email',       type: 'email', span: 1 },
            { label: 'Manager', key: 'manager',     type: 'text',  span: 2 },
          ].map(f => (
            <div key={f.key} className={f.span === 2 ? 'col-span-2' : ''}>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">{f.label}</label>
              <input type={f.type} value={(form as Record<string, string>)[f.key]} onChange={e => F(f.key, e.target.value)}
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900" />
            </div>
          ))}
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Role</label>
            <select value={form.role} onChange={e => F('role', e.target.value)}
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 bg-white">
              <option value="dev">Developer</option><option value="qa">QA</option><option value="ba">BA</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Project</label>
            <select value={form.project} onChange={e => F('project', e.target.value)}
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 bg-white">
              {projectNames.map(p => <option key={p}>{p}</option>)}
            </select>
          </div>
          <div className="col-span-2">
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Status</label>
            <select value={form.status} onChange={e => F('status', e.target.value)}
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 bg-white">
              <option value="active">Active</option><option value="on_leave">On Leave</option><option value="inactive">Inactive</option>
            </select>
          </div>
        </div>
        <div className="flex justify-end gap-3 px-6 py-4 border-t border-gray-100">
          <button onClick={onClose} className="px-4 py-2 border border-gray-200 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50">Cancel</button>
          <button onClick={() => { onSave(form); onClose() }}
            className="px-5 py-2 bg-gray-900 text-white rounded-xl text-sm font-semibold hover:bg-gray-800">Save</button>
        </div>
      </div>
    </div>
  )
}

// ─── Attendee Profile ─────────────────────────────────────────────────────────

export default function AttendeeProfileScreen() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const {
    attendee, project, projects,
    history: myRecords,
    leaves: myLeaves,
    stats,
    monthlyChartData: chartData,
    workModeHeatmapData,
    updateAttendee,
    exportCSV,
  } = useAttendeeProfileViewModel(id)

  const [editing, setEditing] = useState(false)
  const [showAll, setShowAll] = useState(false)

  if (!attendee) {
    return (
      <div className="p-6 flex flex-col items-center justify-center min-h-96">
        <p className="text-gray-400 text-sm">Attendee not found.</p>
        <button onClick={() => navigate('/attendees')}
          className="mt-3 text-sm text-gray-700 underline">Back to Directory</button>
      </div>
    )
  }

  const projectNames = projects.map(p => p.name)

  const displayRecords = showAll ? myRecords : myRecords.slice(0, 10)

  const statusColor = attendee.status === 'active' ? 'bg-green-100 text-green-700 border-green-200'
    : attendee.status === 'on_leave' ? 'bg-yellow-100 text-yellow-700 border-yellow-200'
    : 'bg-gray-100 text-gray-500 border-gray-200'

  const initials = attendee.name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()

  return (
    <div className="p-6 min-h-full">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <button onClick={() => navigate('/attendees')}
          className="w-9 h-9 flex items-center justify-center rounded-xl border border-gray-200 bg-white hover:bg-gray-50 transition-colors">
          <ArrowLeft className="w-4 h-4 text-gray-500" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{attendee.name}</h1>
          <p className="text-sm text-gray-400 mt-0.5">Attendee Profile · {attendee.employee_id}</p>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <button onClick={exportCSV}
            className="flex items-center gap-1.5 px-4 py-2 border border-gray-200 bg-white text-sm font-medium text-gray-600 rounded-xl hover:bg-gray-50 transition-colors">
            <Download className="w-4 h-4" /> Export
          </button>
          <button onClick={() => setEditing(true)}
            className="flex items-center gap-1.5 px-4 py-2 bg-gray-900 text-white text-sm font-medium rounded-xl hover:bg-gray-800 transition-colors">
            <Edit2 className="w-4 h-4" /> Edit Profile
          </button>
        </div>
      </div>

      <div className="flex gap-5">
        {/* Left column */}
        <div className="w-64 shrink-0 space-y-4">
          {/* Profile card */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 flex flex-col items-center text-center">
            <div className="w-20 h-20 rounded-full bg-gray-800 flex items-center justify-center text-2xl font-bold text-white mb-3">
              {initials}
            </div>
            <p className="font-semibold text-gray-900">{attendee.name}</p>
            <p className="text-xs text-gray-400 mt-0.5">{attendee.email}</p>
            <span className={`mt-2 px-3 py-1 border rounded-full text-[11px] font-semibold ${statusColor}`}>
              {attendee.status === 'on_leave' ? 'On Leave' : attendee.status.charAt(0).toUpperCase() + attendee.status.slice(1)}
            </span>
          </div>

          {/* Details */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-3.5">
            {[
              { icon: <User className="w-4 h-4" />,     label: 'Role',    value: attendee.role.toUpperCase() },
              { icon: <Briefcase className="w-4 h-4" />, label: 'Project', value: attendee.project },
              { icon: <User className="w-4 h-4" />,     label: 'Manager', value: attendee.manager || '—' },
              { icon: <Mail className="w-4 h-4" />,      label: 'Email',   value: attendee.email },
              { icon: <Clock className="w-4 h-4" />,     label: 'Scrum',   value: project?.scrum_time ? `${project.scrum_time} (${project.late_grace_minutes}m grace)` : '—' },
              { icon: <Calendar className="w-4 h-4" />,  label: 'Total Records', value: myRecords.length },
            ].map(row => (
              <div key={row.label} className="flex items-start gap-3">
                <div className="w-7 h-7 rounded-lg bg-gray-100 flex items-center justify-center shrink-0 text-gray-500">
                  {row.icon}
                </div>
                <div className="min-w-0">
                  <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">{row.label}</p>
                  <p className="text-sm font-medium text-gray-800 mt-0.5 break-all">{row.value}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Leaves */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-100">
              <h3 className="text-sm font-semibold text-gray-900">Leave History</h3>
            </div>
            {myLeaves.length === 0
              ? <p className="px-4 py-4 text-xs text-gray-400">No leave records found.</p>
              : myLeaves.map(l => {
                  const proj = projects.find(p => p.id === l.project_id)
                  return (
                    <div key={l.id} className="px-4 py-3 border-b border-gray-50 last:border-0">
                      <p className="text-xs font-medium text-gray-900">{l.reason}</p>
                      <p className="text-[11px] text-gray-400">{l.start_date} → {l.end_date}</p>
                      <p className="text-[11px] text-gray-400">{proj?.name}</p>
                    </div>
                  )
                })}
          </div>
        </div>

        {/* Right column */}
        <div className="flex-1 min-w-0 space-y-5">
          {/* Stats */}
          <div className="grid grid-cols-4 gap-4">
            <StatCard label="Attendance Rate" value={`${stats.attendanceRate}%`} sub={`${stats.total} total`} color="text-green-600" />
            <StatCard label="Present"         value={stats.present}              sub={`${stats.late} late`}   color="text-gray-900"  />
            <StatCard label="Absent"           value={stats.absent}              sub="days"                    color="text-red-600"   />
            <StatCard label="WFH Rate"         value={`${stats.wfhRate}%`}       sub="of attended days"        color="text-blue-600"  />
          </div>

          <div className="grid grid-cols-3 gap-4">
            <StatCard label="Late Rate"      value={`${stats.lateRate}%`}  sub="of all records"       color="text-orange-600" />
            <StatCard label="Avg Lateness"   value={`${stats.avgLate}m`}   sub="when late"             color="text-orange-500" />
            <StatCard label="On-Time Streak" value={myRecords.length > 0 && myRecords[0].status === 'present' ? '✓' : '—'} sub="latest record"  color="text-green-600" />
          </div>

          {/* Monthly chart */}
          {chartData.length > 0 && (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="font-semibold text-gray-900">Monthly Attendance</h2>
                  <p className="text-xs text-gray-400">Last {chartData.length} month{chartData.length !== 1 ? 's' : ''}</p>
                </div>
                <TrendingUp className="w-4 h-4 text-gray-300" />
              </div>
              <div className="h-48">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData} barSize={14} barGap={2}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" vertical={false} />
                    <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
                    <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #e5e7eb' }} />
                    <Bar dataKey="present" name="Present" fill="#1f2937"  radius={[3,3,0,0]} />
                    <Bar dataKey="late"    name="Late"    fill="#f97316"  radius={[3,3,0,0]} />
                    <Bar dataKey="absent"  name="Absent"  fill="#e5e7eb"  radius={[3,3,0,0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div className="flex items-center gap-5 mt-2">
                {[['Present','#1f2937'],['Late','#f97316'],['Absent','#e5e7eb']].map(([l, c]) => (
                  <div key={l} className="flex items-center gap-1.5 text-xs text-gray-500">
                    <div className="w-3 h-2 rounded-sm" style={{ backgroundColor: c }} />{l}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Work Mode Heatmap */}
          <WorkModeHeatmap heatmapData={workModeHeatmapData} />

          {/* Attendance history table */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
              <div>
                <h2 className="font-semibold text-gray-900">Attendance History</h2>
                <p className="text-xs text-gray-400">{myRecords.length} records total</p>
              </div>
              <button onClick={exportCSV}
                className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-gray-700">
                <Download className="w-3.5 h-3.5" /> CSV
              </button>
            </div>
            {myRecords.length === 0
              ? (
                <div className="py-14 text-center">
                  <Calendar className="w-8 h-8 text-gray-200 mx-auto mb-2" />
                  <p className="text-sm text-gray-400">No attendance records yet.</p>
                </div>
              ) : (
                <>
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-gray-100">
                        {['Date', 'Status', 'Join Time', 'Work Mode', 'Late (min)', 'Project', 'Notes'].map(col => (
                          <th key={col} className="px-5 py-3 text-left text-[11px] font-semibold text-gray-400 uppercase tracking-wider">{col}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {displayRecords.map(r => {
                        const proj = projects.find(p => p.id === r.project_id)
                        return (
                          <tr key={r.id} className="hover:bg-gray-50/60">
                            <td className="px-5 py-3.5">
                              <p className="text-sm font-medium text-gray-900">{r.date}</p>
                              <p className="text-[11px] text-gray-400">
                                {new Date(r.date + 'T00:00').toLocaleDateString('en-US', { weekday: 'short' })}
                              </p>
                            </td>
                            <td className="px-5 py-3.5">
                              <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${
                                r.status === 'present' ? 'bg-green-50 text-green-700 border-green-200'
                                : r.status === 'late'  ? 'bg-orange-50 text-orange-700 border-orange-200'
                                : 'bg-red-50 text-red-700 border-red-200'
                              }`}>
                                {r.status === 'present' ? <CheckCircle className="w-3 h-3" /> : r.status === 'late' ? <AlertTriangle className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                                {r.status.charAt(0).toUpperCase() + r.status.slice(1)}
                              </span>
                            </td>
                            <td className="px-5 py-3.5 text-sm text-gray-700">{fmt12(r.join_time)}</td>
                            <td className="px-5 py-3.5 text-sm text-gray-700 capitalize">{r.work_mode ?? '—'}</td>
                            <td className="px-5 py-3.5 text-sm text-gray-700">
                              {r.minutes_late > 0
                                ? <span className="px-2 py-0.5 bg-orange-50 text-orange-600 rounded text-xs font-semibold">{r.minutes_late}m</span>
                                : '—'}
                            </td>
                            <td className="px-5 py-3.5 text-sm text-gray-700">{proj?.name ?? '—'}</td>
                            <td className="px-5 py-3.5 text-xs text-gray-500">{r.notes || '—'}</td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                  {myRecords.length > 10 && (
                    <button onClick={() => setShowAll(s => !s)}
                      className="w-full py-3 flex items-center justify-center gap-1.5 text-xs font-medium text-gray-500 hover:bg-gray-50 border-t border-gray-100 transition-colors">
                      {showAll ? <><ChevronUp className="w-3.5 h-3.5" /> Show less</> : <><ChevronDown className="w-3.5 h-3.5" /> Show all {myRecords.length} records</>}
                    </button>
                  )}
                </>
              )}
          </div>
        </div>
      </div>

      {editing && (
        <EditModal
          attendee={attendee}
          projectNames={projectNames}
          onSave={d => updateAttendee(attendee.id, d)}
          onClose={() => setEditing(false)}
        />
      )}
    </div>
  )
}
