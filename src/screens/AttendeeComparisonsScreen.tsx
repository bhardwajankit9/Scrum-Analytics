import { useState } from 'react'
import { Award, TrendingUp, TrendingDown, X } from 'lucide-react'
import { useAttendeeComparisonsViewModel } from '../presentation/viewmodels/useAttendeeComparisonsViewModel'
import { SelectDropdown } from '../components/ui/SelectDropdown'
import { DatePickerPopover } from '../components/ui/DatePickerPopover'
import type { AttendeeComparisonRow } from '../presentation/viewmodels/useAttendeeComparisonsViewModel'

export default function AttendeeComparisonsScreen() {
  const viewModel = useAttendeeComparisonsViewModel()
  const [expandedAttendee, setExpandedAttendee] = useState<string | null>(null)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

  const projects = [...new Set(viewModel.attendees.map((a) => a.project))].sort()
  const roles = [...new Set(viewModel.attendees.map((a) => a.role))].sort()

  // Get top performers
  const topPresent = [...viewModel.comparisons].sort((a, b) => b.present_count - a.present_count)[0]
  const topLate = [...viewModel.comparisons].sort((a, b) => b.late_count - a.late_count)[0]
  const topAbsent = [...viewModel.comparisons].sort((a, b) => b.absent_count - a.absent_count)[0]
  const topWFH = [...viewModel.comparisons].sort((a, b) => b.wfh_count - a.wfh_count)[0]
  const topOffice = [...viewModel.comparisons].sort((a, b) => b.office_count - a.office_count)[0]

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      {/* Header */}
      <div className="sticky top-0 z-40 bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-6 py-5 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Attendee Comparisons</h1>
            <p className="text-sm text-gray-500 mt-1">Benchmark team members across attendance metrics — {viewModel.periodLabel}</p>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Metric Cards */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-8">
          {/* Most Present */}
          {topPresent && (
            <div className="bg-white rounded-xl border border-green-200 p-5 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-center gap-3 mb-2">
                <Award className="w-5 h-5 text-green-600" />
                <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Most Present</span>
              </div>
              <p className="text-2xl font-bold text-green-600">{topPresent.present_count}</p>
              <p className="text-sm text-gray-600 mt-2">{topPresent.name}</p>
              <p className="text-xs text-gray-400 mt-1">{topPresent.project} • {topPresent.present_pct}%</p>
            </div>
          )}

          {/* Most Late */}
          {topLate && (
            <div className="bg-white rounded-xl border border-orange-200 p-5 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-center gap-3 mb-2">
                <TrendingUp className="w-5 h-5 text-orange-600" />
                <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Most Late</span>
              </div>
              <p className="text-2xl font-bold text-orange-600">{topLate.late_count}</p>
              <p className="text-sm text-gray-600 mt-2">{topLate.name}</p>
              <p className="text-xs text-gray-400 mt-1">{topLate.project} • {topLate.late_pct}%</p>
            </div>
          )}

          {/* Most On Leave */}
          {topAbsent && (
            <div className="bg-white rounded-xl border border-red-200 p-5 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-center gap-3 mb-2">
                <TrendingDown className="w-5 h-5 text-red-600" />
                <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Most On Leave</span>
              </div>
              <p className="text-2xl font-bold text-red-600">{topAbsent.absent_count}</p>
              <p className="text-sm text-gray-600 mt-2">{topAbsent.name}</p>
              <p className="text-xs text-gray-400 mt-1">{topAbsent.project} • {topAbsent.absent_pct}%</p>
            </div>
          )}

          {/* Most WFH */}
          {topWFH && (
            <div className="bg-white rounded-xl border border-purple-200 p-5 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-center gap-3 mb-2">
                <span className="text-lg">🏠</span>
                <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Most WFH</span>
              </div>
              <p className="text-2xl font-bold text-purple-600">{topWFH.wfh_count}</p>
              <p className="text-sm text-gray-600 mt-2">{topWFH.name}</p>
              <p className="text-xs text-gray-400 mt-1">{topWFH.project} • {topWFH.wfh_pct}%</p>
            </div>
          )}

          {/* Most Office */}
          {topOffice && (
            <div className="bg-white rounded-xl border border-blue-200 p-5 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-center gap-3 mb-2">
                <span className="text-lg">🏢</span>
                <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Most Office</span>
              </div>
              <p className="text-2xl font-bold text-blue-600">{topOffice.office_count}</p>
              <p className="text-sm text-gray-600 mt-2">{topOffice.name}</p>
              <p className="text-xs text-gray-400 mt-1">{topOffice.project} • {topOffice.office_pct}%</p>
            </div>
          )}
        </div>

        {/* Filters */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Period</label>
              <SelectDropdown
                value={viewModel.periodFilter}
                onChange={(v) => viewModel.setPeriodFilter(v as 'all' | 'week' | 'month' | 'prev_month' | 'quarter' | 'custom')}
                options={[
                  { value: 'all', label: 'All Time' },
                  { value: 'week', label: 'This Week' },
                  { value: 'month', label: 'This Month' },
                  { value: 'prev_month', label: 'Previous Month' },
                  { value: 'quarter', label: 'This Quarter' },
                  { value: 'custom', label: 'Custom Date' },
                ]}
              />
            </div>

            {/* Custom Date Range */}
            {viewModel.periodFilter === 'custom' && (
              <>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">From Date</label>
                  <input
                    type="date"
                    value={viewModel.customDateRange.startDate}
                    onChange={(e) =>
                      viewModel.setCustomDateRange({
                        ...viewModel.customDateRange,
                        startDate: e.target.value,
                      })
                    }
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">To Date</label>
                  <input
                    type="date"
                    value={viewModel.customDateRange.endDate}
                    onChange={(e) =>
                      viewModel.setCustomDateRange({
                        ...viewModel.customDateRange,
                        endDate: e.target.value,
                      })
                    }
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Project</label>
                  <SelectDropdown
                    value={viewModel.projectFilter}
                    onChange={viewModel.setProjectFilter}
                    options={[
                      { value: '', label: 'All Projects' },
                      ...projects.map((p) => ({ value: p, label: p }))
                    ]}
                  />
                </div>
              </>
            )}

            {viewModel.periodFilter !== 'custom' && (
              <>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Project</label>
                  <SelectDropdown
                    value={viewModel.projectFilter}
                    onChange={viewModel.setProjectFilter}
                    options={[
                      { value: '', label: 'All Projects' },
                      ...projects.map((p) => ({ value: p, label: p }))
                    ]}
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Role</label>
                  <SelectDropdown
                    value={viewModel.roleFilter}
                    onChange={viewModel.setRoleFilter}
                    options={[
                      { value: '', label: 'All Roles' },
                      ...roles.map((r) => ({ value: r, label: r }))
                    ]}
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Status</label>
                  <SelectDropdown
                    value={viewModel.statusFilter}
                    onChange={viewModel.setStatusFilter}
                    options={[
                      { value: '', label: 'All Status' },
                      { value: 'active', label: 'Active' },
                      { value: 'inactive', label: 'Inactive' },
                    ]}
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Sort By</label>
                  <SelectDropdown
                    value={viewModel.sortBy}
                    onChange={(v) => viewModel.setSortBy(v as 'name' | 'present' | 'late' | 'absent' | 'wfh')}
                    options={[
                      { value: 'name', label: 'Name (A-Z)' },
                      { value: 'present', label: 'Most Present' },
                      { value: 'late', label: 'Most Late' },
                      { value: 'absent', label: 'Most On Leave' },
                      { value: 'wfh', label: 'Most WFH' },
                    ]}
                  />
                </div>
              </>
            )}
          </div>

          {/* Additional filters row for custom date */}
          {viewModel.periodFilter === 'custom' && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Role</label>
                <SelectDropdown
                  value={viewModel.roleFilter}
                  onChange={viewModel.setRoleFilter}
                  options={[
                    { value: '', label: 'All Roles' },
                    ...roles.map((r) => ({ value: r, label: r }))
                  ]}
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Status</label>
                <SelectDropdown
                  value={viewModel.statusFilter}
                  onChange={viewModel.setStatusFilter}
                  options={[
                    { value: '', label: 'All Status' },
                    { value: 'active', label: 'Active' },
                    { value: 'inactive', label: 'Inactive' },
                  ]}
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Sort By</label>
                <SelectDropdown
                  value={viewModel.sortBy}
                  onChange={(v) => viewModel.setSortBy(v as 'name' | 'present' | 'late' | 'absent' | 'wfh')}
                  options={[
                    { value: 'name', label: 'Name (A-Z)' },
                    { value: 'present', label: 'Most Present' },
                    { value: 'late', label: 'Most Late' },
                    { value: 'absent', label: 'Most On Leave' },
                    { value: 'wfh', label: 'Most WFH' },
                  ]}
                />
              </div>
            </div>
          )}
        </div>

        {/* Comparison Table */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          {/* Toolbar */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-gray-50/50">
            <div>
              <h3 className="font-semibold text-gray-900">Attendee Comparison Data</h3>
              <p className="text-xs text-gray-400 mt-0.5">{viewModel.comparisons.length} attendees</p>
            </div>
            {viewModel.selectionMode ? (
              <div className="flex items-center gap-2">
                {viewModel.selectedIds.size > 0 && (
                  <button
                    onClick={() => setShowDeleteConfirm(true)}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-red-50 text-red-600 rounded-lg text-xs font-medium hover:bg-red-100 border border-red-200"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                    Delete ({viewModel.selectedIds.size})
                  </button>
                )}
                <button
                  onClick={() => viewModel.toggleSelectionMode()}
                  className="px-3 py-1.5 bg-gray-100 text-gray-700 rounded-lg text-xs font-medium hover:bg-gray-200"
                >
                  Cancel
                </button>
              </div>
            ) : (
              <button
                onClick={() => viewModel.toggleSelectionMode()}
                className="px-3 py-1.5 bg-blue-50 text-blue-600 rounded-lg text-xs font-medium hover:bg-blue-100 border border-blue-200"
              >
                Select
              </button>
            )}
          </div>

          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50/50">
                {viewModel.selectionMode && (
                  <th className="px-6 py-3 text-left">
                    <input
                      type="checkbox"
                      checked={viewModel.allSelected}
                      onChange={e => viewModel.selectAll(e.target.checked)}
                      className="w-4 h-4 rounded border-gray-300 text-gray-900 cursor-pointer"
                    />
                  </th>
                )}
                <th className="px-6 py-3 text-left text-[11px] font-semibold text-gray-400 uppercase tracking-wider">Name</th>
                <th className="px-6 py-3 text-left text-[11px] font-semibold text-gray-400 uppercase tracking-wider">ID</th>
                <th className="px-6 py-3 text-left text-[11px] font-semibold text-gray-400 uppercase tracking-wider">Role</th>
                <th className="px-6 py-3 text-left text-[11px] font-semibold text-gray-400 uppercase tracking-wider">Project</th>
                <th className="px-6 py-3 text-center text-[11px] font-semibold text-gray-400 uppercase tracking-wider">Present</th>
                <th className="px-6 py-3 text-center text-[11px] font-semibold text-gray-400 uppercase tracking-wider">Late</th>
                <th className="px-6 py-3 text-center text-[11px] font-semibold text-gray-400 uppercase tracking-wider">On Leave</th>
                <th className="px-6 py-3 text-center text-[11px] font-semibold text-gray-400 uppercase tracking-wider">🏠 WFH</th>
                <th className="px-6 py-3 text-center text-[11px] font-semibold text-gray-400 uppercase tracking-wider">🏢 Office</th>
                <th className="px-6 py-3 text-center text-[11px] font-semibold text-gray-400 uppercase tracking-wider">Total</th>
                <th className="px-6 py-3 text-left text-[11px] font-semibold text-gray-400 uppercase tracking-wider">Attendance %</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
{viewModel.comparisons.map((row: AttendeeComparisonRow) => {
                const isSelected = viewModel.selectedIds.has(row.attendee_id)
                return (
              <tr
                key={row.attendee_id}
                className={`hover:bg-gray-50/40 transition-colors ${viewModel.selectionMode ? 'cursor-pointer' : ''} ${viewModel.selectionMode && isSelected ? 'bg-blue-50' : ''}`}
                onClick={() => {
                  if (viewModel.selectionMode) {
                    setExpandedAttendee(expandedAttendee === row.attendee_id ? null : row.attendee_id)
                  }
                }}
              >
                {/* Checkbox */}
                {viewModel.selectionMode && (
                  <td className="px-6 py-4" onClick={e => e.stopPropagation()}>
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={e => viewModel.toggleSelect(row.attendee_id, e.target.checked)}
                      className="w-4 h-4 rounded border-gray-300 text-gray-900 cursor-pointer"
                    />
                  </td>
                )}

                {/* Name */}
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-xs font-bold text-white">
                      {row.name.split(' ').map((n: string) => n[0]).join('')}
                      </div>
                      <span className="font-medium text-gray-900">{row.name}</span>
                    </div>
                  </td>

                  {/* Employee ID */}
                  <td className="px-6 py-4">
                    <span className="text-sm text-gray-600">{row.employee_id}</span>
                  </td>

                  {/* Role */}
                  <td className="px-6 py-4">
                    <span className="text-sm text-gray-600">{row.role}</span>
                  </td>

                  {/* Project */}
                  <td className="px-6 py-4">
                    <span className="inline-block px-2.5 py-1 bg-blue-50 text-blue-700 rounded-lg text-xs font-medium">
                      {row.project}
                    </span>
                  </td>

                  {/* Present Count */}
                  <td className="px-6 py-4">
                    <div className="text-center">
                      <p className="text-lg font-bold text-green-600">{row.present_count}</p>
                      <p className="text-xs text-gray-400">{row.present_pct}%</p>
                    </div>
                  </td>

                  {/* Late Count */}
                  <td className="px-6 py-4">
                    <div className="text-center">
                      <p className="text-lg font-bold text-orange-600">{row.late_count}</p>
                      <p className="text-xs text-gray-400">{row.late_pct}%</p>
                    </div>
                  </td>

                  {/* Absent Count */}
                  <td className="px-6 py-4">
                    <div className="text-center">
                      <p className="text-lg font-bold text-red-600">{row.absent_count}</p>
                      <p className="text-xs text-gray-400">{row.absent_pct}%</p>
                    </div>
                  </td>

                  {/* WFH Count */}
                  <td className="px-6 py-4">
                    <div className="text-center">
                      <p className="text-lg font-bold text-purple-600">{row.wfh_count}</p>
                      <p className="text-xs text-gray-400">{row.wfh_pct}%</p>
                    </div>
                  </td>

                  {/* Office Count */}
                  <td className="px-6 py-4">
                    <div className="text-center">
                      <p className="text-lg font-bold text-blue-600">{row.office_count}</p>
                      <p className="text-xs text-gray-400">{row.office_pct}%</p>
                    </div>
                  </td>

                  {/* Total Records */}
                  <td className="px-6 py-4">
                    <div className="text-center">
                      <p className="text-sm font-semibold text-gray-900">{row.total_records}</p>
                    </div>
                  </td>

                  {/* Attendance Bar */}
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <div className="w-20 h-2 bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-green-500"
                          style={{ width: `${row.present_pct}%` }}
                        />
                      </div>
                      <span className="text-sm font-medium text-gray-700 w-8 text-right">{row.present_pct}%</span>
                    </div>
                  </td>
                </tr>
                )
              })}
            </tbody>
          </table>

          {viewModel.comparisons.length === 0 && (
            <div className="text-center py-12">
              <p className="text-gray-500">No attendees found matching your filters</p>
            </div>
          )}
        </div>

        {/* Summary Statistics */}
        <div className="mt-8 grid grid-cols-1 md:grid-cols-6 gap-4">
          <div className="bg-white rounded-xl border border-gray-100 p-5">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Total Attendees</p>
            <p className="text-3xl font-bold text-gray-900">{viewModel.comparisons.length}</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-100 p-5">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Avg Present %</p>
            <p className="text-3xl font-bold text-green-600">
              {Math.round(viewModel.comparisons.reduce((sum: number, c: AttendeeComparisonRow) => sum + c.present_pct, 0) / (viewModel.comparisons.length || 1))}%
            </p>
          </div>
          <div className="bg-white rounded-xl border border-gray-100 p-5">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Avg Late %</p>
            <p className="text-3xl font-bold text-orange-600">
              {Math.round(viewModel.comparisons.reduce((sum: number, c: AttendeeComparisonRow) => sum + c.late_pct, 0) / (viewModel.comparisons.length || 1))}%
            </p>
          </div>
          <div className="bg-white rounded-xl border border-gray-100 p-5">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Avg On Leave %</p>
            <p className="text-3xl font-bold text-red-600">
              {Math.round(viewModel.comparisons.reduce((sum: number, c: AttendeeComparisonRow) => sum + c.absent_pct, 0) / (viewModel.comparisons.length || 1))}%
            </p>
          </div>
          <div className="bg-white rounded-xl border border-gray-100 p-5">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Avg WFH %</p>
            <p className="text-3xl font-bold text-purple-600">
              {Math.round(viewModel.comparisons.reduce((sum: number, c: AttendeeComparisonRow) => sum + c.wfh_pct, 0) / (viewModel.comparisons.length || 1))}%
            </p>
          </div>
          <div className="bg-white rounded-xl border border-gray-100 p-5">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Avg Office %</p>
            <p className="text-3xl font-bold text-blue-600">
              {Math.round(viewModel.comparisons.reduce((sum: number, c: AttendeeComparisonRow) => sum + c.office_pct, 0) / (viewModel.comparisons.length || 1))}%
            </p>
          </div>
        </div>

        {showDeleteConfirm && (
          <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6">
              <div className="flex justify-center mb-4">
                <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
                  <X className="w-6 h-6 text-red-600" />
                </div>
              </div>
              <h2 className="text-lg font-semibold text-center text-gray-900 mb-2">
                Delete {viewModel.selectedIds.size} Record{viewModel.selectedIds.size > 1 ? 's' : ''}?
              </h2>
              <p className="text-center text-gray-600 text-sm mb-6">
                All attendance records for the selected attendee{viewModel.selectedIds.size > 1 ? 's' : ''} will be permanently deleted and cannot be recovered.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  className="flex-1 px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    viewModel.deleteSelected(Array.from(viewModel.selectedIds))
                    setShowDeleteConfirm(false)
                    viewModel.toggleSelectionMode()
                  }}
                  className="flex-1 px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg transition"
                >
                  Delete All
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
