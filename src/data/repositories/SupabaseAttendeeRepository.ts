// ─── Supabase Attendee Repository ────────────────────────────────────────────
import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../../lib/supabase/client'
import type { IAttendeeRepository } from '../../domain/repositories'
import type { Attendee } from '../../domain/entities'
import type { AttendeeRow } from '../../lib/supabase/database.types'

function toEntity(r: AttendeeRow): Attendee {
  return { id: r.id, name: r.name, email: r.email, employee_id: r.employee_id,
           role: r.role, project: r.project, manager: r.manager, status: r.status }
}

export function useAttendeeRepository(): IAttendeeRepository {
  const [all, setAll] = useState<Attendee[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.from('attendees').select('*').order('name').then(({ data, error }) => {
      if (error) { console.error('[AttendeeRepo]', error.message) }
      if (data)  setAll((data as AttendeeRow[]).map(toEntity))
      setLoading(false)
    })
  }, [])

  const getById = useCallback((id: string) => all.find(a => a.id === id), [all])

  const add = useCallback((a: Omit<Attendee, 'id'>): Attendee => {
    const tempId = `_tmp_${Date.now()}`
    // If employee_id is blank, generate a unique fallback so the DB unique constraint is satisfied
    const employeeId = a.employee_id.trim() || `EMP-${Date.now()}`
    const email      = a.email?.trim() ?? ''
    const payload = { ...a, employee_id: employeeId, email }
    const optimistic: Attendee = { ...payload, id: tempId }
    setAll(prev => [...prev, optimistic])
    supabase.from('attendees').insert(payload as unknown as AttendeeRow).select().single().then(({ data, error }) => {
      if (error) { console.error('[AttendeeRepo] insert:', error.message); setAll(prev => prev.filter(x => x.id !== tempId)); return }
      if (data)  setAll(prev => prev.map(x => x.id === tempId ? toEntity(data as AttendeeRow) : x))
    })
    return optimistic
  }, [])

  const update = useCallback((id: string, patch: Partial<Omit<Attendee, 'id'>>): Attendee => {
    let result!: Attendee
    setAll(prev => prev.map(a => { if (a.id !== id) return a; result = { ...a, ...patch }; return result }))
    supabase.from('attendees').update(patch as unknown as AttendeeRow).eq('id', id)
      .then(({ error }) => { if (error) console.error('[AttendeeRepo] update:', error.message) })
    return result
  }, [])

  const remove = useCallback((id: string) => {
    setAll(prev => prev.filter(a => a.id !== id))
    supabase.from('attendees').delete().eq('id', id)
      .then(({ error }) => { if (error) console.error('[AttendeeRepo] delete:', error.message) })
  }, [])

  return { all, loading, getById, add, update, remove }
}
