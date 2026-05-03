import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import type { TrendDataPoint } from '../../presentation/viewmodels/useAttendanceTrendsViewModel'

interface AttendanceTrendChartProps {
  data: TrendDataPoint[]
  height?: number
}

export function AttendanceTrendChart({ data, height = 300 }: AttendanceTrendChartProps) {
  if (data.length === 0) {
    return (
      <div className="w-full h-96 flex items-center justify-center bg-gray-50 rounded-xl border border-gray-200">
        <p className="text-gray-400 text-sm">No data available for the selected period</p>
      </div>
    )
  }

  // Sample every Nth point to avoid crowding on x-axis
  const step = Math.ceil(data.length / 15)
  const sampledData = data.filter((_, i) => i % step === 0 || i === data.length - 1)

  return (
    <div className="w-full bg-white rounded-xl border border-gray-200 p-6">
      <h3 className="font-semibold text-gray-900 mb-4">Attendance Trend</h3>
      <ResponsiveContainer width="100%" height={height}>
        <LineChart data={data} margin={{ top: 5, right: 30, left: 0, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
          <XAxis
            dataKey="date"
            stroke="#9ca3af"
            style={{ fontSize: '12px' }}
            tick={{ fill: '#9ca3af' }}
            interval={step - 1}
          />
          <YAxis stroke="#9ca3af" style={{ fontSize: '12px' }} tick={{ fill: '#9ca3af' }} domain={[0, 100]} />
          <Tooltip
            contentStyle={{
              backgroundColor: '#fff',
              border: '1px solid #e5e7eb',
              borderRadius: '8px',
            }}
            formatter={(value: number) => `${value}%`}
            labelFormatter={(label: string) => {
              const date = new Date(label + 'T00:00')
              return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', weekday: 'short' })
            }}
          />
          <Line
            type="monotone"
            dataKey="attendancePercent"
            stroke="#3b82f6"
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 5 }}
            name="Attendance %"
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
