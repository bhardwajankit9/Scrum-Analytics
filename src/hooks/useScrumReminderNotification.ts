import { useEffect, useRef, useCallback } from 'react'
import { useContainer } from '../infrastructure/di/RepositoryProvider'
import { useAuth } from '../infrastructure/di/AuthProvider'
import { supabase } from '../lib/supabase/client'

const notifiedSet = new Set<string>()

function getTodayISO() {
  return new Date().toISOString().slice(0, 10)
}

function getCurrentHHMM(): string {
  const now = new Date()
  return `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`
}

async function requestPermission(): Promise<boolean> {
  if (!('Notification' in window)) return false
  if (Notification.permission === 'granted') return true
  if (Notification.permission === 'denied') return false
  const result = await Notification.requestPermission()
  return result === 'granted'
}

function buildEmailHtml(projectName: string, scrumTime: string): string {
  const [h, m] = scrumTime.split(':').map(Number)
  const period = h >= 12 ? 'PM' : 'AM'
  const fmt = `${h % 12 || 12}:${String(m).padStart(2, '0')} ${period}`
  return `<div style="font-family:sans-serif;max-width:520px;margin:0 auto">
    <div style="background:#111827;padding:20px;border-radius:12px 12px 0 0">
      <h2 style="color:#fff;margin:0;font-size:18px">⏰ Scrum not marked — ${projectName}</h2>
    </div>
    <div style="background:#f3f4f6;padding:20px;border-radius:0 0 12px 12px">
      <p style="margin:0 0 12px;color:#374151">Scrum was scheduled at <strong>${fmt}</strong>. Attendance hasn't been marked yet.</p>
      <a href="/mark" style="display:inline-block;padding:10px 20px;background:#111827;color:#fff;border-radius:8px;text-decoration:none;font-weight:600">Mark Attendance →</a>
    </div>
  </div>`
}

function fireNotification(projectName: string, scrumTime: string, onClickNav: () => void) {
  const [h, m] = scrumTime.split(':').map(Number)
  const period = h >= 12 ? 'PM' : 'AM'
  const fmt = `${h % 12 || 12}:${String(m).padStart(2, '0')} ${period}`
  const n = new Notification(`⏰ Scrum not marked — ${projectName}`, {
    body: `Scrum was scheduled at ${fmt}. Attendance hasn't been marked yet.`,
    icon: '/favicon.png',
    tag: `scrum-reminder-${projectName}`,
    requireInteraction: true,
  })
  n.onclick = () => {
    window.focus()
    onClickNav()
    n.close()
  }
}

export function useScrumReminderNotification(navigateToMark: () => void) {
  const { user } = useAuth()
  const { projectRepo, attendanceRepo } = useContainer()
  const permGranted = useRef(false)
  const userRef = useRef(user)
  userRef.current = user

  const isPMO = user?.role === 'owner_pmo' || user?.role === 'pmo'
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const stableNav = useCallback(navigateToMark, [])

  useEffect(() => {
    if (!isPMO) return
    requestPermission().then(granted => {
      permGranted.current = granted
    })

    function check() {
      if (!permGranted.current) return
      const today = getTodayISO()
      const nowHHMM = getCurrentHHMM()
      const currentUser = userRef.current

      for (const project of projectRepo.all.filter(p => p.status === 'active')) {
        const key = `${project.id}::${today}`
        if (notifiedSet.has(key)) continue
        if (!project.scrum_time || nowHHMM < project.scrum_time) continue

        const alreadyMarked = attendanceRepo.all.some(
          e => e.project_id === project.id && e.date === today
        )
        notifiedSet.add(key)

        if (!alreadyMarked) {
          // 1. OS browser notification
          fireNotification(project.name, project.scrum_time, stableNav)

          // 2. In-app notification row (for the bell)
          if (currentUser?.id) {
            void supabase.from('notifications').insert({
              user_id:      currentUser.id,
              alert_type:   'attendance_reminder',
              title:        `⏰ Scrum not marked — ${project.name}`,
              message:      `Scrum was scheduled at ${project.scrum_time}. Attendance hasn't been marked yet.`,
              related_data: { project_id: project.id, date: today },
            })

            // 3. Email via SendGrid edge function (fire-and-forget)
            if (currentUser.email) {
              void supabase.functions.invoke('send-notification', {
                body: {
                  to:        currentUser.email,
                  subject:   `⏰ Scrum not marked — ${project.name}`,
                  html:      buildEmailHtml(project.name, project.scrum_time),
                  alertType: 'attendance_reminder',
                },
              }).catch(console.error)
            }
          }
        }
      }
    }

    check()
    const timer = setInterval(check, 60_000)
    return () => clearInterval(timer)
  }, [isPMO, projectRepo.all, attendanceRepo.all, stableNav])
}
