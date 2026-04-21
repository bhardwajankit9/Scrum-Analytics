// ─── Supabase Leave Repository ────────────────────────────────────────────────
import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../../lib/supabase/client'
import type { ILeaveRepository } from '../../domain/repositories'
import type { Leave } from '../../domain/entities'
import type { LeaveRow } from '../../lib/supabase/database.types'

function toEntity(r: LeaveRow): Leave {
  return { id: r.id, project_id: r.project_id, attendee_id: r.attendee_id,
           start_date: r.start_date, end_date: r.end_date, reason: r.reason,
           approved_by: r.approved_by, created_at: r.created_at }
}

export function useLeaveRepository(): ILeaveRepository {
  const [all, setAll] = useState<Leave[]>([])

  useEffect(() => {
    supabase.from('leaves').select('*').order('created_at', { ascending: false }).then(({ data, error }) => {
      if (error) { console.error('[LeaveRepo]', error.message); return }
      if (data)  setAll((data as LeaveRow[]).map(toEntity))
    })
  }, [])

  const getByAttendee = useCallback((attendeeId: string) => all.filter(l => l.attendee_id === attendeeId), [all])

  const add = useCallback((l: Omit<Leave, 'id'>): Leave => {
    const tempId = `_tmp_${Date.now()}`
    const optimistic: Leave = { ...l, id: tempId }
    setAll(prev => [...prev, optimistic])
    supabase.from('leaves').insert(l as unknown as LeaveRow).select().single().then(({ data, error }) => {
      if (error) { console.error('[LeaveRepo] insert:', error.message); setAll(prev => prev.filter(x => x.id !== tempId)); return }
      if (data)  setAll(prev => prev.map(x => x.id === tempId ? toEntity(data as LeaveRow) : x))
    })
    return optimistic
  }, [])

  const remove = useCallback((id: string) => {
    setAll(prev => prev.filter(l => l.id !== id))
    supabase.from('leaves').delete().eq('id', id)
      .then(({ error }) => { if (error) console.error('[LeaveRepo] delete:', error.message) })
  }, [])

  return { all, getByAttendee, add, remove }
}
