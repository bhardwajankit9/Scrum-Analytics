import { useEffect, useState, useRef, useCallback } from 'react'
import { RotateCw } from 'lucide-react'
import { SupabaseScrumSessionRepository, SupabaseAttendanceRuleRepository } from '../../data/repositories/ScrumSessionRepository'
import type { Project } from '../../domain/entities'
import type { ScrumSessionRow, AttendanceRuleRow } from '../../lib/supabase/database.types'

interface ProjectScrumInfo {
  project: Project
  defaultTimes: { start: string; end: string } | null
  lastSession: { date: string; start: string; end: string } | null
  sessionCount: number
}

export function ScrumTimesTile({ projects }: { projects: Project[] }) {
  const [scrumInfo, setScrumInfo] = useState<ProjectScrumInfo[]>([])
  const [loading, setLoading] = useState(true)
  
  // Create repos once, not on every render
  const scrumRepo = useRef(new SupabaseScrumSessionRepository())
  const ruleRepo = useRef(new SupabaseAttendanceRuleRepository())
  const lastProjectKey = useRef<string>('')

  const loadData = useCallback(async () => {
    if (projects.length === 0) {
      setScrumInfo([])
      setLoading(false)
      return
    }
    
    // Create a stable key from project IDs to detect actual changes
    const projectKey = projects.map(p => p.id).sort().join(',')
    
    // Skip if same projects (prevent double-fetch on Strict Mode)
    if (lastProjectKey.current && lastProjectKey.current === projectKey) {
      setLoading(false)
      return
    }
    
    // Update the key marker
    lastProjectKey.current = projectKey
    
    setLoading(true)
    try {
      const info = await Promise.all(
        projects.map(async (project) => {
          const [rule, sessions] = await Promise.all([
            ruleRepo.current.getAttendanceRuleByProject(project.id),
            scrumRepo.current.getScrumSessionsByProject(project.id, 1),
          ])

          return {
            project,
            defaultTimes: rule
              ? { start: rule.default_scrum_start_time, end: rule.default_scrum_end_time }
              : null,
            lastSession: sessions[0]
              ? {
                  date: sessions[0].session_date,
                  start: sessions[0].scrum_start_time,
                  end: sessions[0].scrum_end_time,
                }
              : null,
            sessionCount: sessions[0]?.attendees_marked || 0,
          }
        })
      )
      setScrumInfo(info)
    } catch (err) {
      console.error('Failed to load scrum info:', err)
    } finally {
      setLoading(false)
    }
  }, [projects])

  useEffect(() => {
    loadData()
  }, [loadData])

  const fmt12 = (t: string | null) => {
    if (!t) return '—'
    const [h, m] = t.split(':').map(Number)
    const p = h >= 12 ? 'PM' : 'AM'
    return `${h % 12 || 12}:${String(m).padStart(2, '0')} ${p}`
  }

  const formatDate = (d: string) => {
    return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  }

  if (loading) {
    return (
      <div className="bg-white rounded-2xl border border-gray-100 p-6 animate-pulse">
        <div className="h-4 bg-gray-200 rounded w-32 mb-4"></div>
        <div className="space-y-3">
          {[1, 2, 3].map(i => <div key={i} className="h-3 bg-gray-100 rounded w-full"></div>)}
        </div>
      </div>
    )
  }

  return (
    <div className="bg-gradient-to-r from-indigo-50 to-blue-50 rounded-2xl border border-indigo-200 shadow-sm p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">Scrum Times</h3>
        <button
          onClick={loadData}
          className="p-2 hover:bg-indigo-100 rounded-lg transition-colors text-indigo-600"
          title="Refresh scrum times"
        >
          <RotateCw size={16} />
        </button>
      </div>

      <div className="max-h-96 overflow-y-auto space-y-3">
        {scrumInfo.length === 0 ? (
          <p className="text-sm text-gray-500">No scrum times configured</p>
        ) : (
          scrumInfo.map(info => (
            <div key={info.project.id} className="bg-white rounded-lg p-3 border border-indigo-100">
              <p className="font-medium text-gray-900 text-sm">{info.project.name}</p>
              <div className="mt-2 text-xs text-gray-600 space-y-1">
                {info.defaultTimes && (
                  <p>
                    <span className="font-semibold">Default:</span> {fmt12(info.defaultTimes.start)} -{' '}
                    {fmt12(info.defaultTimes.end)}
                  </p>
                )}
                {info.lastSession && (
                  <p>
                    <span className="font-semibold">Last:</span> {fmt12(info.lastSession.start)} -{' '}
                    {fmt12(info.lastSession.end)} on {formatDate(info.lastSession.date)}
                  </p>
                )}
                <p>
                  <span className="font-semibold">Sessions:</span> {info.sessionCount}
                </p>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
