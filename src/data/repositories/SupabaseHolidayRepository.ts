// ─── Supabase Holiday Repository ─────────────────────────────────────────────
import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../../lib/supabase/client'
import type { IHolidayRepository } from '../../domain/repositories'
import type { Holiday } from '../../domain/entities'
import type { HolidayRow } from '../../lib/supabase/database.types'

function toEntity(r: HolidayRow): Holiday {
  return { id: r.id, project_id: r.project_id, holiday_date: r.holiday_date, name: r.name }
}

export function useHolidayRepository(): IHolidayRepository {
  const [all, setAll] = useState<Holiday[]>([])

  useEffect(() => {
    supabase.from('holidays').select('*').order('holiday_date').then(({ data, error }) => {
      if (error) { console.error('[HolidayRepo]', error.message); return }
      if (data)  setAll((data as HolidayRow[]).map(toEntity))
    })
  }, [])

  const add = useCallback((h: Omit<Holiday, 'id'>): Holiday => {
    const tempId = `_tmp_${Date.now()}`
    const optimistic: Holiday = { ...h, id: tempId }
    setAll(prev => [...prev, optimistic])
    supabase.from('holidays').insert(h as unknown as HolidayRow).select().single().then(({ data, error }) => {
      if (error) { console.error('[HolidayRepo] insert:', error.message); setAll(prev => prev.filter(x => x.id !== tempId)); return }
      if (data)  setAll(prev => prev.map(x => x.id === tempId ? toEntity(data as HolidayRow) : x))
    })
    return optimistic
  }, [])

  const remove = useCallback((id: string) => {
    setAll(prev => prev.filter(h => h.id !== id))
    supabase.from('holidays').delete().eq('id', id)
      .then(({ error }) => { if (error) console.error('[HolidayRepo] delete:', error.message) })
  }, [])

  return { all, add, remove }
}
