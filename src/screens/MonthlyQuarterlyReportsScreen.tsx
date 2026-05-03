import { useMemo } from 'react'
import { FileText, Download } from 'lucide-react'
import * as XLSX from 'xlsx'
import jsPDF from 'jspdf'
import html2canvas from 'html2canvas'
import { useMonthlyQuarterlyReportsViewModel } from '../presentation/viewmodels/useMonthlyQuarterlyReportsViewModel'
import { SelectDropdown } from '../components/ui/SelectDropdown'
import type { MonthlyQuarterlyReportRow, AttendeeMonthlyStats } from '../presentation/viewmodels/useMonthlyQuarterlyReportsViewModel'

export default function MonthlyQuarterlyReportsScreen() {
  const viewModel = useMonthlyQuarterlyReportsViewModel()

  const projects = [...new Set(viewModel.attendees.map(a => a.project))].sort()
  const currentYear = new Date().getFullYear()
  const years = Array.from({ length: 5 }, (_, i) => currentYear - 2 + i)
  const months = Array.from({ length: 12 }, (_, i) => ({ value: String(i + 1), label: new Date(2024, i).toLocaleString('en-US', { month: 'long' }) }))
  const quarters = [
    { value: '1', label: 'Q1' },
    { value: '2', label: 'Q2' },
    { value: '3', label: 'Q3' },
    { value: '4', label: 'Q4' },
  ]

  // Export to Excel function
  const exportToExcel = async () => {
    try {
      const wb = XLSX.utils.book_new()

      // Summary sheet
      const summaryData = [
        ['Monthly/Quarterly Report', viewModel.periodLabel],
        [],
        ['Period', 'Total Records', 'Present', 'Late', 'On Leave', 'WFH', 'Office', 'Attendance %'],
        ...viewModel.reportData.map((row: MonthlyQuarterlyReportRow) => [
          row.period,
          row.total_records,
          row.present,
          row.late,
          row.absent,
          row.wfh,
          row.office,
          `${row.avg_attendance}%`,
        ]),
      ]
      const summarySheet = XLSX.utils.aoa_to_sheet(summaryData)
      summarySheet['!cols'] = [{ wch: 15 }, { wch: 15 }, { wch: 12 }, { wch: 12 }, { wch: 12 }, { wch: 12 }, { wch: 12 }, { wch: 15 }]
      XLSX.utils.book_append_sheet(wb, summarySheet, 'Summary')

      // Attendee details sheet
      const attendeeData = [
        ['Attendee Details Report', viewModel.periodLabel],
        [],
        ['Name', 'Employee ID', 'Role', 'Project', 'Month', 'Present', 'Late', 'On Leave', 'WFH', 'Office', 'Total'],
        ...viewModel.attendeeStats.map((stat: AttendeeMonthlyStats) => [
          stat.name,
          stat.employee_id,
          stat.role,
          stat.project,
          stat.month,
          stat.present,
          stat.late,
          stat.absent,
          stat.wfh,
          stat.office,
          stat.total,
        ]),
      ]
      const attendeeSheet = XLSX.utils.aoa_to_sheet(attendeeData)
      attendeeSheet['!cols'] = [
        { wch: 20 }, { wch: 15 }, { wch: 15 }, { wch: 15 }, { wch: 15 },
        { wch: 10 }, { wch: 10 }, { wch: 10 }, { wch: 10 }, { wch: 10 }, { wch: 10 },
      ]
      XLSX.utils.book_append_sheet(wb, attendeeSheet, 'Attendee Details')

      const filename = `report_${viewModel.periodLabel.replace(/\s+/g, '_')}.xlsx`
      XLSX.writeFile(wb, filename)
    } catch (error) {
      console.error('Excel export error:', error)
      alert('Failed to export Excel file. Make sure xlsx library is installed.')
    }
  }

  // Export to PDF function
  const exportToPDF = async () => {
    try {
      const element = document.getElementById('pdf-report')
      if (!element) {
        alert('Report element not found')
        return
      }

      const canvas = await html2canvas(element, { scale: 2 })
      const imgData = canvas.toDataURL('image/png')

      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
      })

      const imgWidth = 210 - 20 // A4 width - margins
      const imgHeight = (canvas.height * imgWidth) / canvas.width
      let heightLeft = imgHeight
      let position = 10 // Top margin

      pdf.addImage(imgData, 'PNG', 10, position, imgWidth, imgHeight)
      heightLeft -= pdf.internal.pageSize.getHeight() - 20

      while (heightLeft >= 0) {
        position = heightLeft - imgHeight
        pdf.addPage()
        pdf.addImage(imgData, 'PNG', 10, position, imgWidth, imgHeight)
        heightLeft -= pdf.internal.pageSize.getHeight()
      }

      const filename = `report_${viewModel.periodLabel.replace(/\s+/g, '_')}.pdf`
      pdf.save(filename)
    } catch (error) {
      console.error('PDF export error:', error)
      alert('Failed to export PDF. Make sure jspdf and html2canvas libraries are installed.')
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      {/* Header */}
      <div className="sticky top-0 z-40 bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-6 py-5 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Monthly/Quarterly Reports</h1>
            <p className="text-sm text-gray-500 mt-1">Generate and export attendance reports with PDF and Excel</p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={exportToPDF}
              className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 transition-colors"
            >
              <FileText className="w-4 h-4" />
              Export PDF
            </button>
            <button
              onClick={exportToExcel}
              className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 transition-colors"
            >
              <Download className="w-4 h-4" />
              Export Excel
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Filters */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6 mb-8">
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Report Type</label>
              <SelectDropdown
                value={viewModel.reportPeriod}
                onChange={(v) => viewModel.setReportPeriod(v as 'monthly' | 'quarterly')}
                options={[
                  { value: 'monthly', label: 'Monthly' },
                  { value: 'quarterly', label: 'Quarterly' },
                ]}
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Year</label>
              <SelectDropdown
                value={String(viewModel.year)}
                onChange={(v) => viewModel.setYear(parseInt(v))}
                options={years.map(y => ({ value: String(y), label: String(y) }))}
              />
            </div>

            {viewModel.reportPeriod === 'monthly' && (
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Month</label>
                <SelectDropdown
                  value={String(viewModel.month)}
                  onChange={(v) => viewModel.setMonth(parseInt(v))}
                  options={months}
                />
              </div>
            )}

            {viewModel.reportPeriod === 'quarterly' && (
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Quarter</label>
                <SelectDropdown
                  value={String(viewModel.quarter)}
                  onChange={(v) => viewModel.setQuarter(parseInt(v))}
                  options={quarters}
                />
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Project</label>
              <SelectDropdown
                value={viewModel.projectFilter}
                onChange={viewModel.setProjectFilter}
                options={[
                  { value: '', label: 'All Projects' },
                  ...projects.map(p => ({ value: p, label: p }))
                ]}
              />
            </div>
          </div>
        </div>

        {/* Report Container for PDF export */}
        <div id="pdf-report" className="bg-white rounded-xl border border-gray-100 shadow-sm p-8 mb-8">
          {/* Report Header */}
          <div className="mb-8 pb-6 border-b border-gray-200">
            <h2 className="text-2xl font-bold text-gray-900">{viewModel.periodLabel}</h2>
            {viewModel.projectFilter && (
              <p className="text-sm text-gray-600 mt-2">Project: {viewModel.projectFilter}</p>
            )}
            <p className="text-xs text-gray-400 mt-1">Generated on {new Date().toLocaleDateString()}</p>
          </div>

          {/* Summary Statistics */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            <div className="bg-green-50 rounded-lg p-4 border border-green-200">
              <p className="text-xs font-semibold text-gray-500 uppercase mb-1">Total Present</p>
              <p className="text-2xl font-bold text-green-600">
                {viewModel.reportData.reduce((sum, r) => sum + r.present, 0)}
              </p>
            </div>
            <div className="bg-orange-50 rounded-lg p-4 border border-orange-200">
              <p className="text-xs font-semibold text-gray-500 uppercase mb-1">Total Late</p>
              <p className="text-2xl font-bold text-orange-600">
                {viewModel.reportData.reduce((sum, r) => sum + r.late, 0)}
              </p>
            </div>
            <div className="bg-red-50 rounded-lg p-4 border border-red-200">
              <p className="text-xs font-semibold text-gray-500 uppercase mb-1">Total On Leave</p>
              <p className="text-2xl font-bold text-red-600">
                {viewModel.reportData.reduce((sum, r) => sum + r.absent, 0)}
              </p>
            </div>
            <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
              <p className="text-xs font-semibold text-gray-500 uppercase mb-1">Avg Attendance</p>
              <p className="text-2xl font-bold text-blue-600">
                {Math.round(viewModel.reportData.reduce((sum, r) => sum + r.avg_attendance, 0) / (viewModel.reportData.length || 1))}%
              </p>
            </div>
          </div>

          {/* Summary Table */}
          <div className="mb-8">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Period Summary</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200 bg-gray-50">
                    <th className="px-4 py-3 text-left font-semibold text-gray-700">Period</th>
                    <th className="px-4 py-3 text-center font-semibold text-gray-700">Total</th>
                    <th className="px-4 py-3 text-center font-semibold text-gray-700">Present</th>
                    <th className="px-4 py-3 text-center font-semibold text-gray-700">Late</th>
                    <th className="px-4 py-3 text-center font-semibold text-gray-700">On Leave</th>
                    <th className="px-4 py-3 text-center font-semibold text-gray-700">WFH</th>
                    <th className="px-4 py-3 text-center font-semibold text-gray-700">Office</th>
                    <th className="px-4 py-3 text-center font-semibold text-gray-700">Attendance %</th>
                  </tr>
                </thead>
                <tbody>
                  {viewModel.reportData.map((row, idx) => (
                    <tr key={idx} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="px-4 py-3 font-medium text-gray-900">{row.period}</td>
                      <td className="px-4 py-3 text-center text-gray-600">{row.total_records}</td>
                      <td className="px-4 py-3 text-center text-green-600 font-medium">{row.present}</td>
                      <td className="px-4 py-3 text-center text-orange-600 font-medium">{row.late}</td>
                      <td className="px-4 py-3 text-center text-red-600 font-medium">{row.absent}</td>
                      <td className="px-4 py-3 text-center text-purple-600 font-medium">{row.wfh}</td>
                      <td className="px-4 py-3 text-center text-blue-600 font-medium">{row.office}</td>
                      <td className="px-4 py-3 text-center font-bold text-gray-900">{row.avg_attendance}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Attendee Details */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Attendee Details</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200 bg-gray-50">
                    <th className="px-4 py-3 text-left font-semibold text-gray-700">Name</th>
                    <th className="px-4 py-3 text-left font-semibold text-gray-700">Employee ID</th>
                    <th className="px-4 py-3 text-left font-semibold text-gray-700">Role</th>
                    <th className="px-4 py-3 text-left font-semibold text-gray-700">Project</th>
                    <th className="px-4 py-3 text-center font-semibold text-gray-700">Present</th>
                    <th className="px-4 py-3 text-center font-semibold text-gray-700">Late</th>
                    <th className="px-4 py-3 text-center font-semibold text-gray-700">On Leave</th>
                    <th className="px-4 py-3 text-center font-semibold text-gray-700">WFH</th>
                    <th className="px-4 py-3 text-center font-semibold text-gray-700">Office</th>
                    <th className="px-4 py-3 text-center font-semibold text-gray-700">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {viewModel.attendeeStats.map((stat, idx) => (
                    <tr key={idx} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="px-4 py-3 font-medium text-gray-900">{stat.name}</td>
                      <td className="px-4 py-3 text-gray-600">{stat.employee_id}</td>
                      <td className="px-4 py-3 text-gray-600">{stat.role}</td>
                      <td className="px-4 py-3 text-gray-600">{stat.project}</td>
                      <td className="px-4 py-3 text-center text-green-600 font-medium">{stat.present}</td>
                      <td className="px-4 py-3 text-center text-orange-600 font-medium">{stat.late}</td>
                      <td className="px-4 py-3 text-center text-red-600 font-medium">{stat.absent}</td>
                      <td className="px-4 py-3 text-center text-purple-600 font-medium">{stat.wfh}</td>
                      <td className="px-4 py-3 text-center text-blue-600 font-medium">{stat.office}</td>
                      <td className="px-4 py-3 text-center font-bold text-gray-900">{stat.total}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
