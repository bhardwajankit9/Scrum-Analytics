import { useState } from 'react'
import { Plus, Edit2, Archive, RotateCcw, X, FolderOpen, Users, Activity, CheckCircle } from 'lucide-react'
import { useProjectViewModel } from '../presentation/viewmodels/useProjectViewModel'
import { usePermissions } from '../domain/permissions'
import type { Project } from '../domain/entities'
import { ShimmerStyle, SkeletonMetricCard, SkeletonProjectCard } from '../components/ui/Skeleton'

const TIMEZONES = ['Asia/Kolkata', 'Asia/Dubai', 'America/New_York', 'America/Los_Angeles', 'Europe/London', 'UTC']

// ─── Modal ────────────────────────────────────────────────────────────────────

interface ProjectFormProps {
  initial?: Partial<Project>
  onSave: (p: Omit<Project, 'id'>) => void
  onClose: () => void
  title: string
}

function ProjectFormModal({ initial, onSave, onClose, title }: ProjectFormProps) {
  const [form, setForm] = useState({
    name:                initial?.name ?? '',
    description:         initial?.description ?? '',
    scrum_time:          initial?.scrum_time ?? '10:15',
    scrum_timezone:      initial?.scrum_timezone ?? 'Asia/Kolkata',
    late_grace_minutes:  initial?.late_grace_minutes ?? 5,
    status:              initial?.status ?? 'active',
  })

  function f(key: keyof typeof form, val: string | number) {
    setForm(prev => ({ ...prev, [key]: val }))
  }

  const valid = form.name.trim() && form.scrum_timezone

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="font-semibold text-gray-900">{title}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Project Name *</label>
              <input
                value={form.name}
                onChange={e => f('name', e.target.value)}
                placeholder="e.g. Project Phoenix"
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
              />
            </div>
            <div className="col-span-2">
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Description</label>
              <input
                value={form.description}
                onChange={e => f('description', e.target.value)}
                placeholder="Team or domain description"
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Scrum Time *</label>
              <input
                type="time"
                value={form.scrum_time}
                onChange={e => f('scrum_time', e.target.value)}
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Late Grace (min)</label>
              <input
                type="number"
                min={0}
                max={30}
                value={form.late_grace_minutes}
                onChange={e => f('late_grace_minutes', Number(e.target.value))}
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
              />
            </div>
            <div className="col-span-2">
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Timezone *</label>
              <select
                value={form.scrum_timezone}
                onChange={e => f('scrum_timezone', e.target.value)}
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 bg-white"
              >
                {TIMEZONES.map(tz => <option key={tz}>{tz}</option>)}
              </select>
            </div>
          </div>
        </div>
        <div className="flex items-center justify-end gap-3 px-6 pb-6">
          <button onClick={onClose} className="px-4 py-2 border border-gray-200 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors">
            Cancel
          </button>
          <button
            onClick={() => { if (valid) { onSave(form as Omit<Project, 'id'>); onClose() } }}
            disabled={!valid}
            className="px-5 py-2 bg-gray-900 text-white rounded-xl text-sm font-semibold hover:bg-gray-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            Save Project
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function ProjectsScreen() {
  const { projects, attendees, attendanceRecords, addProject, updateProject, archiveProject, restoreProject, activeCount, archivedCount, dataLoading } = useProjectViewModel()
  const perms = usePermissions()

  const [showAdd, setShowAdd]     = useState(false)
  const [editProj, setEditProj]   = useState<Project | null>(null)
  const [filter, setFilter]       = useState<'all' | 'active' | 'archived'>('all')

  const displayed = projects.filter(p => filter === 'all' || p.status === filter)

  const stats = {
    total:    projects.length,
    active:   activeCount,
    archived: archivedCount,
    attendees: attendees.length,
  }

  function getProjectAttendees(proj: Project) {
    return attendees.filter(a => a.project === proj.name && a.status === 'active').length
  }

  function getAttendanceRate(proj: Project) {
    const records = attendanceRecords.filter(r => r.project_id === proj.id)
    if (!records.length) return null
    const present = records.filter(r => r.status === 'present' || r.status === 'late').length
    return Math.round((present / records.length) * 100)
  }

  function fmt12(t: string) {
    const [h, m] = t.split(':').map(Number)
    const p = h >= 12 ? 'PM' : 'AM'
    return `${h % 12 || 12}:${String(m).padStart(2, '0')} ${p}`
  }

  return (
    <div className="p-6 min-h-full">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Projects</h1>
          <p className="text-sm text-gray-400 mt-0.5">Manage scrum projects and their settings</p>
        </div>
        {perms.canManageProjects && (
          <button
            onClick={() => setShowAdd(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-gray-900 text-white text-sm font-semibold rounded-xl hover:bg-gray-800 transition-colors"
          >
            <Plus className="w-4 h-4" /> New Project
          </button>
        )}
      </div>

      {/* Stats */}
      <ShimmerStyle />
      <div className="grid grid-cols-4 gap-4 mb-6">
        {dataLoading ? (
          <>{[0,1,2,3].map(i => <SkeletonMetricCard key={i} />)}</>
        ) : (
          <>
            {[
              { label: 'Total Projects', value: stats.total,    icon: <FolderOpen className="w-5 h-5 text-gray-600" /> },
              { label: 'Active',         value: stats.active,   icon: <CheckCircle className="w-5 h-5 text-green-600" /> },
              { label: 'Archived',       value: stats.archived, icon: <Archive className="w-5 h-5 text-gray-400" /> },
              { label: 'Total Attendees',value: stats.attendees,icon: <Users className="w-5 h-5 text-blue-600" /> },
            ].map(s => (
              <div key={s.label} className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center shrink-0">{s.icon}</div>
                  <div>
                    <p className="text-[11px] text-gray-400 uppercase tracking-wide font-semibold">{s.label}</p>
                    <p className="text-2xl font-bold text-gray-900">{s.value}</p>
                  </div>
                </div>
              </div>
            ))}
          </>
        )}
      </div>

      {/* Filter tabs */}
      <div className="flex items-center gap-1 mb-5">
        {(['all', 'active', 'archived'] as const).map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              filter === f ? 'bg-gray-900 text-white' : 'text-gray-500 hover:bg-gray-100'
            }`}
          >
            {f.charAt(0).toUpperCase() + f.slice(1)}
          </button>
        ))}
      </div>

      {/* Project cards */}
      {dataLoading ? (
        <div className="grid grid-cols-2 gap-4">
          {[0,1,2,3].map(i => <SkeletonProjectCard key={i} />)}
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4">
          {displayed.map(proj => {
          const attendeeCount = getProjectAttendees(proj)
          const rate = getAttendanceRate(proj)
          return (
            <div
              key={proj.id}
              className={`bg-white rounded-2xl border shadow-sm overflow-hidden ${
                proj.status === 'archived' ? 'border-gray-100 opacity-70' : 'border-gray-100'
              }`}
            >
              <div className="p-5">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-gray-900 rounded-xl flex items-center justify-center shrink-0">
                      <FolderOpen className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900">{proj.name}</p>
                      <p className="text-xs text-gray-400">{proj.description}</p>
                    </div>
                  </div>
                  <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${
                    proj.status === 'active'
                      ? 'bg-green-100 text-green-700'
                      : 'bg-gray-100 text-gray-500'
                  }`}>
                    {proj.status}
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-3 py-3 border-t border-b border-gray-100 my-3">
                  <div>
                    <p className="text-[10px] text-gray-400 uppercase tracking-wide">Scrum Time</p>
                    <p className="text-sm font-semibold text-gray-900 mt-0.5">{fmt12(proj.scrum_time)}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-gray-400 uppercase tracking-wide">Grace</p>
                    <p className="text-sm font-semibold text-gray-900 mt-0.5">{proj.late_grace_minutes}min</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-gray-400 uppercase tracking-wide">Attendees</p>
                    <p className="text-sm font-semibold text-gray-900 mt-0.5">{attendeeCount}</p>
                  </div>
                </div>

                {/* Attendance rate bar */}
                <div className="mb-4">
                  <div className="flex items-center justify-between text-xs mb-1.5">
                    <span className="text-gray-500 flex items-center gap-1">
                      <Activity className="w-3 h-3" /> Attendance Rate
                    </span>
                    <span className="font-semibold text-gray-900">
                      {rate !== null ? `${rate}%` : 'No data'}
                    </span>
                  </div>
                  <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gray-900 rounded-full transition-all"
                      style={{ width: `${rate ?? 0}%` }}
                    />
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {perms.canManageProjects && (
                    <button
                      onClick={() => setEditProj(proj)}
                      className="flex-1 flex items-center justify-center gap-1.5 py-2 border border-gray-200 rounded-xl text-xs font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                    >
                      <Edit2 className="w-3.5 h-3.5" /> Edit
                    </button>
                  )}
                  {perms.canManageProjects && proj.status === 'active' && (
                    <button
                      onClick={() => updateProject(proj.id, { status: 'archived' })}
                      className="flex-1 flex items-center justify-center gap-1.5 py-2 border border-gray-200 rounded-xl text-xs font-medium text-gray-500 hover:bg-gray-50 transition-colors"
                    >
                      <Archive className="w-3.5 h-3.5" /> Archive
                    </button>
                  )}
                  {perms.canManageProjects && proj.status !== 'active' && (
                    <button
                      onClick={() => updateProject(proj.id, { status: 'active' })}
                      className="flex-1 flex items-center justify-center gap-1.5 py-2 border border-green-200 rounded-xl text-xs font-medium text-green-700 hover:bg-green-50 transition-colors"
                    >
                      <RotateCcw className="w-3.5 h-3.5" /> Activate
                    </button>
                  )}
                  {!perms.canManageProjects && (
                    <span className="flex-1 text-center text-xs text-gray-400 py-2">View only</span>
                  )}
                </div>
              </div>
              <div className="px-5 py-2.5 bg-gray-50 border-t border-gray-100 text-[10px] text-gray-400">
                {proj.scrum_timezone}
              </div>
            </div>
          )
        })}
        </div>
      )}

      {!dataLoading && displayed.length === 0 && (
        <div className="bg-white rounded-2xl border border-gray-100 py-20 text-center shadow-sm">
          <FolderOpen className="w-10 h-10 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-400 text-sm">No projects found.</p>
          <button onClick={() => setShowAdd(true)} className="mt-4 px-4 py-2 bg-gray-900 text-white rounded-xl text-sm font-medium">
            Create First Project
          </button>
        </div>
      )}

      {/* Add modal */}
      {showAdd && (
        <ProjectFormModal
          title="New Project"
          onSave={addProject}
          onClose={() => setShowAdd(false)}
        />
      )}

      {/* Edit modal */}
      {editProj && (
        <ProjectFormModal
          title={`Edit — ${editProj.name}`}
          initial={editProj}
          onSave={(p) => updateProject(editProj.id, p)}
          onClose={() => setEditProj(null)}
        />
      )}
    </div>
  )
}
