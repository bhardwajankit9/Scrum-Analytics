import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, Bell, Settings, Plus, Download, Eye, Trash2, Edit2, X, Users, UserCheck, UserX, FolderOpen } from 'lucide-react'
import { useAttendeeViewModel } from '../presentation/viewmodels/useAttendeeViewModel'
import type { Attendee } from '../domain/entities'
import { SelectDropdown } from '../components/ui/SelectDropdown'
import { ShimmerStyle, SkeletonMetricCard, SkeletonTableRows } from '../components/ui/Skeleton'

// ─── Attendee Form Modal ──────────────────────────────────────────────────────

interface AttendeeFormProps {
  initial?: Partial<Attendee>
  onSave: (a: Omit<Attendee, 'id'>) => void
  onClose: () => void
  title: string
  projects: string[]
}

function AttendeeFormModal({ initial, onSave, onClose, title, projects, attendees }: AttendeeFormProps & { attendees: Attendee[] }) {
  const [form, setForm] = useState({
    name:        initial?.name ?? '',
    email:       initial?.email ?? '',
    employee_id: initial?.employee_id ?? '',
    role:        initial?.role ?? 'dev' as 'dev' | 'qa' | 'ba' | 'lead',
    project:     initial?.project ?? projects[0] ?? '',
    manager:     initial?.manager ?? '',
    status:      initial?.status ?? 'active' as 'active' | 'on_leave' | 'inactive',
  })

  const isDuplicate = (email: string, employee_id: string) =>
    attendees.some(a => {
      if (initial?.id && a.id === initial.id) return false  // skip self when editing
      return (!!email && a.email === email) || (!!employee_id && a.employee_id === employee_id)
    })
  const duplicateError = form.name.trim() ? isDuplicate(form.email.trim(), form.employee_id.trim()) : false
  const valid = !!(form.name.trim() && !duplicateError)

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="font-semibold text-gray-900">{title}</h2>
          <button onClick={onClose}><X className="w-5 h-5 text-gray-400 hover:text-gray-600" /></button>
        </div>
        <div className="p-6 grid grid-cols-2 gap-4">
          {duplicateError && (
            <div className="col-span-2 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
              An attendee with this email or employee ID already exists.
            </div>
          )}
          <div className="col-span-2">
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Full Name <span className="text-red-400">*</span></label>
            <input value={form.name} onChange={e => setForm(p => ({...p, name: e.target.value}))}
              placeholder="e.g. Sarah Johnson"
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Employee ID <span className="text-gray-300 font-normal normal-case">(optional)</span></label>
            <input value={form.employee_id} onChange={e => setForm(p => ({...p, employee_id: e.target.value}))}
              placeholder="EMP-0001"
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Email <span className="text-gray-300 font-normal normal-case">(optional)</span></label>
            <input type="email" value={form.email} onChange={e => setForm(p => ({...p, email: e.target.value}))}
              placeholder="name@company.com"
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Role</label>
            <SelectDropdown
              value={form.role}
              onChange={v => setForm(p => ({...p, role: v as 'dev'|'qa'|'ba'|'lead'}))}
              options={[{ value: 'dev', label: 'Developer' }, { value: 'qa', label: 'QA' }, { value: 'ba', label: 'BA' }, { value: 'lead', label: 'Lead' }]}
              className="w-full"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Project</label>
            <SelectDropdown
              value={form.project}
              onChange={v => setForm(p => ({...p, project: v}))}
              options={projects.map(pr => ({ value: pr, label: pr }))}
              className="w-full"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Manager</label>
            <input value={form.manager} onChange={e => setForm(p => ({...p, manager: e.target.value}))}
              placeholder="Manager name"
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Status</label>
            <SelectDropdown
              value={form.status}
              onChange={v => setForm(p => ({...p, status: v as 'active'|'on_leave'|'inactive'}))}
              options={[
                { value: 'active',   label: 'Active'   },
                { value: 'on_leave', label: 'On Leave' },
                { value: 'inactive', label: 'Inactive' },
              ]}
              className="w-full"
            />
          </div>
        </div>
        <div className="flex items-center justify-end gap-3 px-6 pb-6">
          <button onClick={onClose} className="px-4 py-2 border border-gray-200 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50">Cancel</button>
          <button onClick={() => { if (valid) { onSave(form); onClose() } }}
            disabled={!valid}
            className="px-5 py-2 bg-gray-900 text-white rounded-xl text-sm font-semibold hover:bg-gray-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
            Save Attendee
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Delete Confirm ───────────────────────────────────────────────────────────

function DeleteConfirmModal({ name, onConfirm, onClose }: { name: string; onConfirm: () => void; onClose: () => void }) {
  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm" onClick={e => e.stopPropagation()}>
        <div className="p-6 text-center">
          <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Trash2 className="w-5 h-5 text-red-600" />
          </div>
          <h2 className="font-semibold text-gray-900 mb-2">Delete Attendee?</h2>
          <p className="text-sm text-gray-500">
            Are you sure you want to remove <strong>{name}</strong>? This cannot be undone.
          </p>
        </div>
        <div className="flex items-center gap-3 px-6 pb-6">
          <button onClick={onClose} className="flex-1 py-2 border border-gray-200 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50">Cancel</button>
          <button onClick={() => { onConfirm(); onClose() }}
            className="flex-1 py-2 bg-red-600 text-white rounded-xl text-sm font-semibold hover:bg-red-700 transition-colors">
            Delete
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── View Detail Panel ────────────────────────────────────────────────────────

function DetailPanel({ attendee, onClose }: { attendee: Attendee; onClose: () => void }) {
  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-end sm:items-center justify-end" onClick={onClose}>
      <div className="bg-white h-full sm:h-auto sm:rounded-2xl shadow-xl w-full max-w-sm" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="font-semibold text-gray-900">Attendee Details</h2>
          <button onClick={onClose}><X className="w-5 h-5 text-gray-400 hover:text-gray-600" /></button>
        </div>
        <div className="p-6">
          <div className="flex flex-col items-center text-center mb-6">
            <div className="w-16 h-16 rounded-full bg-gray-800 flex items-center justify-center text-xl font-bold text-white mb-3">
              {attendee.name.split(' ').map(n => n[0]).join('')}
            </div>
            <h3 className="font-semibold text-gray-900 text-lg">{attendee.name}</h3>
            <p className="text-sm text-gray-400">{attendee.email}</p>
            <span className={`mt-2 px-2.5 py-1 rounded-full text-xs font-medium ${
              attendee.status === 'active' ? 'bg-green-100 text-green-700' :
              attendee.status === 'on_leave' ? 'bg-yellow-100 text-yellow-700' :
              'bg-gray-100 text-gray-500'
            }`}>
              {attendee.status.replace('_', ' ')}
            </span>
          </div>
          <div className="space-y-3">
            {[
              ['Employee ID',  attendee.employee_id],
              ['Role',         attendee.role.toUpperCase()],
              ['Project',      attendee.project],
              ['Manager',      attendee.manager || '—'],
            ].map(([label, val]) => (
              <div key={label} className="flex items-center justify-between py-2 border-b border-gray-100">
                <span className="text-xs text-gray-400 font-medium">{label}</span>
                <span className="text-sm text-gray-900 font-medium">{val}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function AttendeeDirectoryScreen() {
  const { attendees, projects, filtered, search, setSearch,
    roleFilter, setRoleFilter, statusFilter, setStatusFilter,
    projectFilter, setProjectFilter,
    addAttendee, updateAttendee, deleteAttendee, dataLoading } = useAttendeeViewModel()
  const navigate = useNavigate()
  const [showAdd, setShowAdd]           = useState(false)
  const [editTarget, setEditTarget]     = useState<Attendee | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<Attendee | null>(null)
  const [viewTarget, setViewTarget]     = useState<Attendee | null>(null)

  const projectNames = [...new Set(projects.filter(p => p.status === 'active').map(p => p.name))]

  return (
    <div className="p-6 min-h-full">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Attendee Directory</h1>
          <p className="text-sm text-gray-400 mt-0.5">Manage and view all tracked attendees</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input type="text" value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search attendees..."
              className="pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-200 w-52 bg-white" />
          </div>
          <button className="w-9 h-9 flex items-center justify-center rounded-lg border border-gray-200 bg-white hover:bg-gray-50">
            <Bell className="w-4 h-4 text-gray-500" />
          </button>
          <button className="w-9 h-9 flex items-center justify-center rounded-lg border border-gray-200 bg-white hover:bg-gray-50">
            <Settings className="w-4 h-4 text-gray-500" />
          </button>
        </div>
      </div>

      {/* Stats */}
      <ShimmerStyle />
      <div className="grid grid-cols-4 gap-4 mb-6">
        {dataLoading ? (
          <>{[0,1,2,3].map(i => <SkeletonMetricCard key={i} />)}</>
        ) : (
          <>
            {[
              { label: 'Total Attendees', value: attendees.length,                                         sub: '+2 this month',     icon: <Users className="w-5 h-5 text-gray-600" /> },
              { label: 'Active',          value: attendees.filter(a => a.status === 'active').length,       sub: '90% of total',      icon: <UserCheck className="w-5 h-5 text-green-600" /> },
              { label: 'On Leave',        value: attendees.filter(a => a.status === 'on_leave').length,     sub: '↓2 from last week', icon: <UserX className="w-5 h-5 text-yellow-600" /> },
              { label: 'Projects',        value: projectNames.length,                                       sub: '',                  icon: <FolderOpen className="w-5 h-5 text-blue-600" /> },
            ].map(s => (
              <div key={s.label} className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center shrink-0">{s.icon}</div>
                  <div>
                    <p className="text-[11px] text-gray-400 uppercase tracking-wide font-semibold">{s.label}</p>
                    <p className="text-xl font-bold text-gray-900 mt-0.5">
                      {s.value}
                      {s.sub && <span className="text-xs font-normal text-gray-400 ml-1.5">{s.sub}</span>}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </>
        )}
      </div>

      {/* Filter bar */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 mb-6 flex items-center gap-3 flex-wrap">
        <SelectDropdown
          value={projectFilter}
          onChange={setProjectFilter}
          options={[{ value: '', label: 'All Projects' }, ...projectNames.map(n => ({ value: n, label: n }))]}
          placeholder="All Projects"
          allowClear
          className="min-w-[140px]"
        />
        <SelectDropdown
          value={roleFilter}
          onChange={setRoleFilter}
          options={[
            { value: '',    label: 'All Roles'  },
            { value: 'dev', label: 'Developer'  },
            { value: 'qa',  label: 'QA'         },
            { value: 'ba',  label: 'BA'         },
            { value: 'lead',label: 'Lead'       },
          ]}
          placeholder="All Roles"
          allowClear
          className="min-w-[120px]"
        />
        <SelectDropdown
          value={statusFilter}
          onChange={setStatusFilter}
          options={[
            { value: '',         label: 'All Status' },
            { value: 'active',   label: 'Active'     },
            { value: 'on_leave', label: 'On Leave'   },
            { value: 'inactive', label: 'Inactive'   },
          ]}
          placeholder="All Status"
          allowClear
          className="min-w-[120px]"
        />
        <div className="ml-auto flex items-center gap-2">
          <button onClick={() => setShowAdd(true)}
            className="flex items-center gap-1.5 px-4 py-2 bg-gray-900 text-white text-sm font-medium rounded-lg hover:bg-gray-800 transition-colors">
            <Plus className="w-4 h-4" /> Add Attendee
          </button>
          <button className="w-9 h-9 flex items-center justify-center border border-gray-200 rounded-lg bg-white hover:bg-gray-50">
            <Download className="w-4 h-4 text-gray-500" />
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <div>
            <h2 className="font-semibold text-gray-900">All Attendees</h2>
            <p className="text-xs text-gray-400 mt-0.5">{filtered.length} of {attendees.length} attendees</p>
          </div>
        </div>
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-100">
              {['Attendee', 'Role', 'Project', 'Manager', 'Status', 'Actions'].map(col => (
                <th key={col} className="px-5 py-3 text-left text-[11px] font-semibold text-gray-400 uppercase tracking-wider">{col}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {dataLoading ? (
              <SkeletonTableRows rows={6} cols={6} />
            ) : filtered.map(a => (
              <tr key={a.id} className="hover:bg-gray-50/60 transition-colors">
                <td className="px-5 py-3.5">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-xs font-bold text-gray-600 shrink-0">
                      {a.name.split(' ').map(n => n[0]).join('')}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">{a.name}</p>
                      <p className="text-xs text-gray-400">{a.email}</p>
                    </div>
                  </div>
                </td>
                <td className="px-5 py-3.5">
                  <span className="px-2.5 py-1 bg-gray-100 text-gray-700 text-xs font-semibold rounded-lg uppercase">{a.role}</span>
                </td>
                <td className="px-5 py-3.5 text-sm text-gray-700">{a.project}</td>
                <td className="px-5 py-3.5 text-sm text-gray-500">{a.manager || '—'}</td>
                <td className="px-5 py-3.5">
                  <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${
                    a.status === 'active'   ? 'bg-green-50 text-green-700 border border-green-200' :
                    a.status === 'on_leave' ? 'bg-yellow-50 text-yellow-700 border border-yellow-200' :
                    'bg-gray-50 text-gray-500 border border-gray-200'
                  }`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${
                      a.status === 'active' ? 'bg-green-500' : a.status === 'on_leave' ? 'bg-yellow-500' : 'bg-gray-400'
                    }`} />
                    {a.status === 'on_leave' ? 'On Leave' : a.status.charAt(0).toUpperCase() + a.status.slice(1)}
                  </span>
                </td>
                <td className="px-5 py-3.5">
                  <div className="flex items-center gap-2">
                    <button onClick={() => navigate(`/attendees/${a.id}`)} className="text-gray-300 hover:text-blue-500 transition-colors" title="View Profile">
                      <Eye className="w-4 h-4" />
                    </button>
                    <button onClick={() => setEditTarget(a)} className="text-gray-300 hover:text-gray-700 transition-colors" title="Edit">
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button onClick={() => setDeleteTarget(a)} className="text-gray-300 hover:text-red-500 transition-colors" title="Delete">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))})
          </tbody>
        </table>
        {!dataLoading && filtered.length === 0 && (
          <div className="py-14 text-center">
            <Users className="w-8 h-8 text-gray-200 mx-auto mb-2" />
            <p className="text-gray-400 text-sm">No attendees match the current filters.</p>
          </div>
        )}
        <div className="px-5 py-3 border-t border-gray-100 text-xs text-gray-400">
          Showing <strong className="text-gray-700">{filtered.length}</strong> of <strong className="text-gray-700">{attendees.length}</strong> attendees
        </div>
      </div>

      {showAdd  && <AttendeeFormModal title="Add Attendee" projects={projectNames} onSave={addAttendee} onClose={() => setShowAdd(false)} attendees={attendees} />}
      {editTarget && <AttendeeFormModal title={`Edit — ${editTarget.name}`} initial={editTarget} projects={projectNames} onSave={d => updateAttendee(editTarget.id, d)} onClose={() => setEditTarget(null)} attendees={attendees} />}
      {deleteTarget && <DeleteConfirmModal name={deleteTarget.name} onConfirm={() => deleteAttendee(deleteTarget.id)} onClose={() => setDeleteTarget(null)} />}
      {viewTarget && <DetailPanel attendee={viewTarget} onClose={() => setViewTarget(null)} />}
    </div>
  )
}
