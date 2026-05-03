import { useState, useMemo } from 'react'
import { PublicHolidayRepository } from '../data/repositories/PublicHolidayRepository'
import { useSettingsViewModel } from '../presentation/viewmodels/useSettingsViewModel'
import { X, Trash2, Calendar, Plus, Users } from 'lucide-react'
import { SelectDropdown } from '../components/ui/SelectDropdown'
import { DatePickerPopover } from '../components/ui/DatePickerPopover'
import type { PublicHoliday } from '../domain/entities'

export default function HolidayManagementScreen() {
  const holidayRepo = new PublicHolidayRepository()
  const { projects, attendees, leaves, addLeave, removeLeave: deleteLeave } = useSettingsViewModel()
  const [formOpen, setFormOpen] = useState(false)
  const [leaveFormOpen, setLeaveFormOpen] = useState(false)
  const [formData, setFormData] = useState({ name: '', date: '', country: 'IN' })
  const [lForm, setLForm] = useState({ project_id: projects[0]?.id ?? '', attendee_id: '', start_date: '', end_date: '', reason: '' })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.name || !formData.date) return

    holidayRepo.addHoliday({
      id: crypto.randomUUID(),
      name: formData.name,
      date: formData.date,
      country: formData.country,
      created_at: new Date().toISOString(),
    })
    setFormData({ name: '', date: '', country: 'IN' })
    setFormOpen(false)
  }

  const handleDelete = (id: string) => {
    if (confirm('Delete this holiday?')) {
      holidayRepo.removeHoliday(id)
    }
  }

  const handleLeaveSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!lForm.attendee_id || !lForm.start_date || !lForm.end_date) return

    addLeave({ ...lForm, approved_by: 'Admin User' })
    setLForm(p => ({...p, attendee_id: '', start_date: '', end_date: '', reason: ''}))
    setLeaveFormOpen(false)
  }

  const handleLeaveDelete = (id: string) => {
    if (confirm('Delete this leave?')) {
      deleteLeave(id)
    }
  }

  const projectAttendees = attendees.filter(a => a.project === projects.find(p => p.id === lForm.project_id)?.name)

  const sortedHolidays = useMemo(
    () => [...holidayRepo.all].sort((a, b) => a.date.localeCompare(b.date)),
    [holidayRepo.all]
  )

  const upcomingHolidays = sortedHolidays.filter(h => h.date >= new Date().toISOString().slice(0, 10))

  return (
    <div className="p-6 min-h-full">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Public Holidays</h1>
          <p className="text-sm text-gray-400 mt-0.5">Manage public holidays and special dates for attendance tracking</p>
        </div>
        <button
          onClick={() => setFormOpen(true)}
          className="flex items-center gap-2 px-5 py-2.5 bg-gray-900 text-white rounded-xl hover:bg-gray-800 transition-colors font-semibold text-sm"
        >
          <Plus className="w-4 h-4" /> Add Holiday
        </button>
      </div>

      {/* Form Modal */}
      {formOpen && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={() => setFormOpen(false)}>
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h2 className="font-semibold text-gray-900">Add Public Holiday</h2>
              <button onClick={() => { setFormOpen(false); setFormData({ name: '', date: '', country: 'IN' }) }} className="text-gray-400 hover:text-gray-600 transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Holiday Name *</label>
                <input
                  type="text"
                  placeholder="e.g., Labour Day"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Date *</label>
                <input
                  type="date"
                  value={formData.date}
                  onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Country</label>
                <select
                  value={formData.country}
                  onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 bg-white"
                >
                  <option value="IN">India</option>
                  <option value="US">United States</option>
                  <option value="UK">United Kingdom</option>
                  <option value="AU">Australia</option>
                </select>
              </div>
              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => { setFormOpen(false); setFormData({ name: '', date: '', country: 'IN' }) }}
                  className="px-4 py-2 border border-gray-200 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-gray-900 text-white rounded-xl text-sm font-semibold hover:bg-gray-800 transition-colors"
                >
                  Add Holiday
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Holidays Table */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden mb-6">
        {upcomingHolidays.length === 0 ? (
          <div className="p-12 text-center">
            <Calendar className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-lg font-medium text-gray-900">No upcoming holidays</p>
            <p className="text-sm text-gray-400 mt-1">Add a holiday to get started</p>
          </div>
        ) : (
          <table className="w-full">
            <thead className="bg-gray-50/50 border-b border-gray-100">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Holiday Name</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Date</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Day</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Country</th>
                <th className="px-6 py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {upcomingHolidays.map((h) => (
                <tr key={h.id} className="hover:bg-gray-50/40 transition-colors">
                  <td className="px-6 py-4">
                    <p className="text-sm font-medium text-gray-900">{h.name}</p>
                  </td>
                  <td className="px-6 py-4">
                    <p className="text-sm text-gray-600">{new Date(h.date + 'T00:00:00').toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}</p>
                  </td>
                  <td className="px-6 py-4">
                    <p className="text-sm text-gray-600">{new Date(h.date + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'long' })}</p>
                  </td>
                  <td className="px-6 py-4">
                    <p className="text-sm text-gray-600">{h.country}</p>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <button
                      onClick={() => handleDelete(h.id)}
                      className="inline-flex items-center gap-1.5 text-red-600 hover:text-red-700 transition-colors text-sm font-medium"
                    >
                      <Trash2 className="w-4 h-4" />
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Info Box */}
      <div className="flex items-start gap-3 p-4 bg-amber-50 border border-amber-200 rounded-xl mb-6">
        <span className="text-lg mt-0.5">💡</span>
        <div>
          <p className="text-sm font-semibold text-amber-900">Public Holiday Policy</p>
          <p className="text-xs text-amber-800 mt-1">
            When a date is marked as a public holiday, all team members are automatically considered unavailable. No attendance tracking will occur on that day, and all members will be displayed with a special holiday status.
          </p>
        </div>
      </div>

      {/* Leave Management Section */}
      <div className="mt-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2"><Users className="w-6 h-6" /> Leave Management</h2>
            <p className="text-sm text-gray-400 mt-0.5">Manage employee leaves and time off</p>
          </div>
          <button
            onClick={() => setLeaveFormOpen(true)}
            className="flex items-center gap-2 px-5 py-2.5 bg-gray-900 text-white rounded-xl hover:bg-gray-800 transition-colors font-semibold text-sm"
          >
            <Plus className="w-4 h-4" /> Add Leave
          </button>
        </div>

        {/* Leave Form Modal */}
        {leaveFormOpen && (
          <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={() => setLeaveFormOpen(false)}>
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl" onClick={e => e.stopPropagation()}>
              <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
                <h2 className="font-semibold text-gray-900">Add Leave</h2>
                <button onClick={() => setLeaveFormOpen(false)} className="text-gray-400 hover:text-gray-600 transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <form onSubmit={handleLeaveSubmit} className="p-6 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Project *</label>
                    <SelectDropdown
                      value={lForm.project_id}
                      onChange={v => setLForm(p => ({...p, project_id: v, attendee_id: ''}))}
                      options={projects.map(p => ({ value: p.id, label: p.name }))}
                      className="w-full"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Attendee *</label>
                    <SelectDropdown
                      value={lForm.attendee_id}
                      onChange={v => setLForm(p => ({...p, attendee_id: v}))}
                      options={[{ value: '', label: 'Select attendee' }, ...projectAttendees.map(a => ({ value: a.id, label: a.name }))]}
                      className="w-full"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Start Date *</label>
                    <DatePickerPopover 
                      value={lForm.start_date} 
                      onChange={v => setLForm(p => ({...p, start_date: v}))} 
                      fullWidth 
                      placeholder="Start date" 
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">End Date *</label>
                    <DatePickerPopover 
                      value={lForm.end_date} 
                      onChange={v => setLForm(p => ({...p, end_date: v}))} 
                      fullWidth 
                      placeholder="End date" 
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Reason</label>
                  <input value={lForm.reason} onChange={e => setLForm(p => ({...p, reason: e.target.value}))}
                    placeholder="Reason for leave"
                    className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900" />
                </div>
                <div className="flex items-center justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setLeaveFormOpen(false)}
                    className="px-4 py-2 border border-gray-200 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 bg-gray-900 text-white rounded-xl text-sm font-semibold hover:bg-gray-800 transition-colors"
                  >
                    Add Leave
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Leaves Table */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          {leaves.length === 0 ? (
            <div className="p-12 text-center">
              <Users className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-lg font-medium text-gray-900">No leaves recorded</p>
              <p className="text-sm text-gray-400 mt-1">Add a leave record to get started</p>
            </div>
          ) : (
            <table className="w-full">
              <thead className="bg-gray-50/50 border-b border-gray-100">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Attendee</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Project</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Period</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Reason</th>
                  <th className="px-6 py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {leaves.map((l) => {
                  const attendee = attendees.find(a => a.id === l.attendee_id)
                  const project = projects.find(p => p.id === l.project_id)
                  return (
                    <tr key={l.id} className="hover:bg-gray-50/40 transition-colors">
                      <td className="px-6 py-4">
                        <p className="text-sm font-medium text-gray-900">{attendee?.name ?? 'Unknown'}</p>
                      </td>
                      <td className="px-6 py-4">
                        <p className="text-sm text-gray-600">{project?.name ?? 'Unknown'}</p>
                      </td>
                      <td className="px-6 py-4">
                        <p className="text-sm text-gray-600">{l.start_date} → {l.end_date}</p>
                      </td>
                      <td className="px-6 py-4">
                        <p className="text-sm text-gray-600">{l.reason || '—'}</p>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <button
                          onClick={() => handleLeaveDelete(l.id)}
                          className="inline-flex items-center gap-1.5 text-red-600 hover:text-red-700 transition-colors text-sm font-medium"
                        >
                          <Trash2 className="w-4 h-4" />
                          Delete
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  )
}
