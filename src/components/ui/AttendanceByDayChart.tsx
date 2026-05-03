import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import type { DayOfWeekTrend } from '../../presentation/viewmodels/useAttendanceTrendsViewModel'

interface AttendanceByDayChartProps {
  data: DayOfWeekTrend[]
  height?: number
}

export function AttendanceByDayChart({ data, height = 300 }: AttendanceByDayChartProps) {
  if (data.length === 0) {
    return (
      <div className="w-full h-96 flex items-center justify-center bg-gray-50 rounded-xl border border-gray-200">
        <p className="text-gray-400 text-sm">No data available</p>
      </div>
    )
  }

  return (
    <div className="w-full bg-white rounded-xl border border-gray-200 p-6">
      <h3 className="font-semibold text-gray-900 mb-4">Attendance by Day of Week</h3>
      <ResponsiveContainer width="100%" height={height}>
        <BarChart data={data} margin={{ top: 5, right: 30, left: 0, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
          <XAxis dataKey="day" stroke="#9ca3af" style={{ fontSize: '12px' }} tick={{ fill: '#9ca3af' }} />
          <YAxis stroke="#9ca3af" style={{ fontSize: '12px' }} tick={{ fill: '#9ca3af' }} domain={[0, 100]} />
          <Tooltip
            contentStyle={{
              backgroundColor: '#fff',
              border: '1px solid #e5e7eb',
              borderRadius: '8px',
            }}
            formatter={(value: number) => `${value}%`}
          />
          <Bar dataKey="avgAttendance" fill="#10b981" radius={[8, 8, 0, 0]} name="Avg Attendance %" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
