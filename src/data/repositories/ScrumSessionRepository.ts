import { supabase } from '../../lib/supabase/client'
import type { Database } from '../../lib/supabase/database.types'

export type ScrumSessionRow = Database['public']['Tables']['scrum_sessions']['Row']
export type AttendanceRuleRow = Database['public']['Tables']['attendance_rules']['Row']

// ─── Interfaces ────────────────────────────────────────────────────────────────

export interface IScrumSessionRepository {
  saveScrumSession(projectId: string, sessionDate: string, startTime: string, endTime: string): Promise<void>
  getScrumSessionsByProject(projectId: string, limit?: number): Promise<ScrumSessionRow[]>
}

export interface IAttendanceRuleRepository {
  saveAttendanceRule(
    projectId: string,
    defaultStartTime: string,
    defaultEndTime: string,
    gracePeriodMinutes: number,
    timezone: string
  ): Promise<void>
  getAttendanceRuleByProject(projectId: string): Promise<AttendanceRuleRow | null>
}

// ─── Supabase Implementation ────────────────────────────────────────────────────

export class SupabaseScrumSessionRepository implements IScrumSessionRepository {
  async saveScrumSession(
    projectId: string,
    sessionDate: string,
    startTime: string,
    endTime: string
  ): Promise<void> {
    const durationMinutes = this.calculateDuration(startTime, endTime)
    const maxRetries = 3
    let lastError: Error | null = null

    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        const { error } = await supabase
          .from('scrum_sessions')
          .upsert(
            {
              project_id: projectId,
              session_date: sessionDate,
              scrum_start_time: startTime,
              scrum_end_time: endTime,
              duration_minutes: durationMinutes,
            },
            { onConflict: 'project_id,session_date' }
          )

        if (error) throw new Error(`Failed to save scrum session: ${error.message}`)
        return
      } catch (err) {
        lastError = err as Error
        if (lastError.message.includes('Lock') || lastError.message.includes('AbortError')) {
          if (attempt < maxRetries - 1) {
            await new Promise(resolve => setTimeout(resolve, 100 * (attempt + 1)))
            continue
          }
        }
        throw lastError
      }
    }

    throw lastError || new Error('Failed to save scrum session after retries')
  }

  async getScrumSessionsByProject(projectId: string, limit: number = 10): Promise<ScrumSessionRow[]> {
    const maxRetries = 3
    let lastError: Error | null = null

    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        const { data, error } = await supabase
          .from('scrum_sessions')
          .select('*')
          .eq('project_id', projectId)
          .order('session_date', { ascending: false })
          .limit(limit)

        if (error) throw new Error(`Failed to get scrum sessions: ${error.message}`)
        return data || []
      } catch (err) {
        lastError = err as Error
        if (lastError.message.includes('Lock') || lastError.message.includes('AbortError')) {
          if (attempt < maxRetries - 1) {
            await new Promise(resolve => setTimeout(resolve, 100 * (attempt + 1)))
            continue
          }
        }
        throw lastError
      }
    }

    throw lastError || new Error('Failed to get scrum sessions after retries')
  }

  private calculateDuration(startTime: string, endTime: string): number {
    const [sh, sm] = startTime.split(':').map(Number)
    const [eh, em] = endTime.split(':').map(Number)
    const startTotal = sh * 60 + sm
    let endTotal = eh * 60 + em
    if (endTotal < startTotal) endTotal += 24 * 60 // Next day
    return endTotal - startTotal
  }
}

export class SupabaseAttendanceRuleRepository implements IAttendanceRuleRepository {
  async saveAttendanceRule(
    projectId: string,
    defaultStartTime: string,
    defaultEndTime: string,
    gracePeriodMinutes: number,
    timezone: string
  ): Promise<void> {
    const maxRetries = 3
    let lastError: Error | null = null

    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        const { error } = await supabase
          .from('attendance_rules')
          .upsert(
            {
              project_id: projectId,
              default_scrum_start_time: defaultStartTime,
              default_scrum_end_time: defaultEndTime,
              grace_period_minutes: gracePeriodMinutes,
              timezone,
            },
            { onConflict: 'project_id' }
          )

        if (error) throw new Error(`Failed to save attendance rule: ${error.message}`)
        return
      } catch (err) {
        lastError = err as Error
        if (lastError.message.includes('Lock') || lastError.message.includes('AbortError')) {
          if (attempt < maxRetries - 1) {
            await new Promise(resolve => setTimeout(resolve, 100 * (attempt + 1)))
            continue
          }
        }
        throw lastError
      }
    }

    throw lastError || new Error('Failed to save attendance rule after retries')
  }

  async getAttendanceRuleByProject(projectId: string): Promise<AttendanceRuleRow | null> {
    const maxRetries = 3
    let lastError: Error | null = null

    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        const { data, error } = await supabase
          .from('attendance_rules')
          .select('*')
          .eq('project_id', projectId)
          .single()

        if (error && error.code !== 'PGRST116') {
          throw new Error(`Failed to get attendance rule: ${error.message}`)
        }
        return data || null
      } catch (err) {
        lastError = err as Error
        // If it's a lock error, wait and retry; otherwise fail immediately
        if (lastError.message.includes('Lock') || lastError.message.includes('AbortError')) {
          if (attempt < maxRetries - 1) {
            await new Promise(resolve => setTimeout(resolve, 100 * (attempt + 1)))
            continue
          }
        }
        throw lastError
      }
    }

    throw lastError || new Error('Failed to get attendance rule after retries')
  }
}

// ─── In-Memory Mock Implementations (for testing) ────────────────────────────

export class InMemoryScrumSessionRepository implements IScrumSessionRepository {
  private sessions: ScrumSessionRow[] = []

  async saveScrumSession(
    projectId: string,
    sessionDate: string,
    startTime: string,
    endTime: string
  ): Promise<void> {
    const existing = this.sessions.findIndex(
      s => s.project_id === projectId && s.session_date === sessionDate
    )
    const durationMinutes = this.calculateDuration(startTime, endTime)
    const session: ScrumSessionRow = {
      id: existing >= 0 ? this.sessions[existing].id : crypto.randomUUID(),
      project_id: projectId,
      session_date: sessionDate,
      scrum_start_time: startTime,
      scrum_end_time: endTime,
      duration_minutes: durationMinutes,
      attendees_marked: 0,
      created_at: new Date().toISOString(),
    }
    if (existing >= 0) this.sessions[existing] = session
    else this.sessions.push(session)
  }

  async getScrumSessionsByProject(projectId: string, limit: number = 10): Promise<ScrumSessionRow[]> {
    return this.sessions
      .filter(s => s.project_id === projectId)
      .sort((a, b) => new Date(b.session_date).getTime() - new Date(a.session_date).getTime())
      .slice(0, limit)
  }

  private calculateDuration(startTime: string, endTime: string): number {
    const [sh, sm] = startTime.split(':').map(Number)
    const [eh, em] = endTime.split(':').map(Number)
    const startTotal = sh * 60 + sm
    let endTotal = eh * 60 + em
    if (endTotal < startTotal) endTotal += 24 * 60
    return endTotal - startTotal
  }
}

export class InMemoryAttendanceRuleRepository implements IAttendanceRuleRepository {
  private rules: AttendanceRuleRow[] = []

  async saveAttendanceRule(
    projectId: string,
    defaultStartTime: string,
    defaultEndTime: string,
    gracePeriodMinutes: number,
    timezone: string
  ): Promise<void> {
    const existing = this.rules.find(r => r.project_id === projectId)
    const rule: AttendanceRuleRow = {
      id: existing?.id || crypto.randomUUID(),
      project_id: projectId,
      default_scrum_start_time: defaultStartTime,
      default_scrum_end_time: defaultEndTime,
      grace_period_minutes: gracePeriodMinutes,
      late_threshold_minutes: 0,
      auto_mark_absent_after: null,
      working_days: 'mon,tue,wed,thu,fri',
      timezone,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }
    if (existing) {
      const idx = this.rules.indexOf(existing)
      this.rules[idx] = rule
    } else {
      this.rules.push(rule)
    }
  }

  async getAttendanceRuleByProject(projectId: string): Promise<AttendanceRuleRow | null> {
    return this.rules.find(r => r.project_id === projectId) || null
  }
}
