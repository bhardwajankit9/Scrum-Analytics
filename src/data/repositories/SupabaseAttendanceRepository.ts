// ─── Supabase Attendance Repository ──────────────────────────────────────────
import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../../lib/supabase/client'
import type { IAttendanceRepository } from '../../domain/repositories'
import type { AttendanceEntry } from '../../domain/entities'
import type { AttendanceEntryRow } from '../../lib/supabase/database.types'

function toEntity(r: AttendanceEntryRow): AttendanceEntry {
  return {
    id: r.id, project_id: r.project_id, attendee_id: r.attendee_id,
    date: r.date, join_time: r.join_time, status: r.status,
    minutes_late: r.minutes_late, work_mode: r.work_mode,
    notes: r.notes, marked_by: r.marked_by, marked_at: r.marked_at,
  }
}

export function useAttendanceRepository(): IAttendanceRepository {
  const [all, setAll] = useState<AttendanceEntry[]>([])

  useEffect(() => {
    supabase.from('attendance_entries').select('*').order('marked_at', { ascending: false })
      .then(({ data, error }) => {
        if (error) { console.error('[AttendanceRepo]', error.message); return }
        if (data)  setAll((data as AttendanceEntryRow[]).map(toEntity))
      })
  }, [])

  const getByDate = useCallback((date: string) => all.filter(r => r.date === date), [all])
  const getByProjectAndDate = useCallback(
    (projectId: string, date: string) => all.filter(r => r.project_id === projectId && r.date === date),
    [all],
  )
  const getByAttendee = useCallback((attendeeId: string) => all.filter(r => r.attendee_id === attendeeId), [all])

  // Replaces entire project×date batch
  const saveEntries = useCallback((entries: AttendanceEntry[]) => {
    if (!entries.length) return
    const { project_id, date } = entries[0]
    // Optimistic update
    setAll(prev => [...prev.filter(r => !(r.project_id === project_id && r.date === date)), ...entries])
    // Always strip id — let Supabase generate a real UUID via gen_random_uuid().
    // Conflict on (project_id, attendee_id, date) handles updates.
    const rows = entries.map(({ id: _id, ...rest }) => rest)
    supabase.from('attendance_entries')
      .upsert(rows as unknown as AttendanceEntryRow[], { onConflict: 'project_id,attendee_id,date' })
      .select()
      .then(({ data, error }) => {
        if (error) {
          console.error('[AttendanceRepo] saveEntries:', error.message)
          // Roll back optimistic update on error
          setAll(prev => prev.filter(r => !(r.project_id === project_id && r.date === date)))
          return
        }
        // Replace optimistic entries with real DB rows (with real UUIDs)
        if (data) {
          const saved = (data as AttendanceEntryRow[]).map(toEntity)
          setAll(prev => [
            ...prev.filter(r => !(r.project_id === project_id && r.date === date)),
            ...saved,
          ])
        }
      })
  }, [])

  // Upserts a single manual entry
  const addEntry = useCallback((entry: AttendanceEntry) => {
    // Optimistic update
    setAll(prev => [
      ...prev.filter(r => !(r.project_id === entry.project_id && r.attendee_id === entry.attendee_id && r.date === entry.date)),
      entry,
    ])
    // Strip id — let DB generate UUID
    const { id: _id, ...rest } = entry
    supabase.from('attendance_entries')
      .upsert(rest as unknown as AttendanceEntryRow, { onConflict: 'project_id,attendee_id,date' })
      .select().single()
      .then(({ data, error }) => {
        if (error) {
          console.error('[AttendanceRepo] addEntry:', error.message)
          // Roll back
          setAll(prev => prev.filter(r => !(r.project_id === entry.project_id && r.attendee_id === entry.attendee_id && r.date === entry.date)))
          return
        }
        if (data) {
          const saved = toEntity(data as AttendanceEntryRow)
          setAll(prev => [
            ...prev.filter(r => !(r.project_id === saved.project_id && r.attendee_id === saved.attendee_id && r.date === saved.date)),
            saved,
          ])
        }
      })
  }, [])

  const updateEntry = useCallback((id: string, patch: Partial<Omit<AttendanceEntry, 'id'>>) => {
    setAll(prev => prev.map(r => r.id === id ? { ...r, ...patch } : r))
    supabase.from('attendance_entries')
      .update(patch as Partial<AttendanceEntryRow>)
      .eq('id', id)
      .then(({ error }) => {
        if (error) {
          console.error('[AttendanceRepo] updateEntry:', error.message)
          // Roll back
          supabase.from('attendance_entries').select('*').eq('id', id).single()
            .then(({ data }) => {
              if (data) setAll(prev => prev.map(r => r.id === id ? toEntity(data as AttendanceEntryRow) : r))
            })
        }
      })
  }, [])

  const removeEntry = useCallback((id: string) => {
    setAll(prev => prev.filter(r => r.id !== id))
    supabase.from('attendance_entries').delete().eq('id', id)
      .then(({ error }) => {
        if (error) console.error('[AttendanceRepo] removeEntry:', error.message)
      })
  }, [])

  return { all, getByDate, getByProjectAndDate, getByAttendee, saveEntries, addEntry, updateEntry, removeEntry }
}
