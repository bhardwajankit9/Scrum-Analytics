// ─── Admin Profile ViewModel ──────────────────────────────────────────────────
import { useMemo } from 'react'
import { useContainer } from '../../infrastructure/di/RepositoryProvider'
import { useAuth } from '../../infrastructure/di/AuthProvider'

export function useAdminProfileViewModel() {
  const { attendanceRepo, projectRepo, attendeeRepo } = useContainer()
  const { user } = useAuth()

  const activityLog = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10)
    const byDate: Record<string, number> = {}
    attendanceRepo.all.forEach(r => { byDate[r.date] = (byDate[r.date] ?? 0) + 1 })
    const recentDates = Object.keys(byDate).sort().reverse().slice(0, 5)
    const base = recentDates.map(d => ({
      date: d,
      action: `Marked ${byDate[d]} attendance record${byDate[d] !== 1 ? 's' : ''}`,
      type: 'attendance' as const,
    }))
    return [
      { date: today, action: 'Logged in',                    type: 'auth'     as const },
      { date: today, action: 'Updated notification settings', type: 'settings' as const },
      ...base,
    ]
  }, [attendanceRepo.all])

  const stats = useMemo(() => ({
    total:     attendanceRepo.all.length,
    projects:  projectRepo.all.filter(p => p.status === 'active').length,
    attendees: attendeeRepo.all.filter(a => a.status === 'active').length,
  }), [attendanceRepo.all, projectRepo.all, attendeeRepo.all])

  return { activityLog, stats, user }
}
