// ─── InMemory Attendance Repository ──────────────────────────────────────────

import { useState, useCallback } from 'react'
import type { IAttendanceRepository } from '../../domain/repositories'
import type { AttendanceEntry } from '../../domain/entities'
import { SEED_ATTENDANCE } from '../seeds'

export function useAttendanceRepository(): IAttendanceRepository {
  const [all, setAll] = useState<AttendanceEntry[]>(SEED_ATTENDANCE)

  const getByDate = useCallback(
    (date: string) => all.filter(r => r.date === date),
    [all],
  )

  const getByProjectAndDate = useCallback(
    (projectId: string, date: string) =>
      all.filter(r => r.project_id === projectId && r.date === date),
    [all],
  )

  const getByAttendee = useCallback(
    (attendeeId: string) => all.filter(r => r.attendee_id === attendeeId),
    [all],
  )

  // Replaces the entire project×date batch atomically
  const saveEntries = useCallback((entries: AttendanceEntry[]) => {
    if (!entries.length) return
    const { project_id, date } = entries[0]
    setAll(prev => [
      ...prev.filter(r => !(r.project_id === project_id && r.date === date)),
      ...entries,
    ])
  }, [])

  // Upserts a single manual entry (overwrites same attendee×project×date)
  const addEntry = useCallback((entry: AttendanceEntry) => {
    setAll(prev => [
      ...prev.filter(
        r => !(r.project_id === entry.project_id &&
               r.attendee_id === entry.attendee_id &&
               r.date === entry.date),
      ),
      entry,
    ])
  }, [])

  const updateEntry = useCallback((id: string, patch: Partial<Omit<AttendanceEntry, 'id'>>) => {
    setAll(prev => prev.map(r => r.id === id ? { ...r, ...patch } : r))
  }, [])

  const removeEntry = useCallback((id: string) => {
    setAll(prev => prev.filter(r => r.id !== id))
  }, [])

  return { all, getByDate, getByProjectAndDate, getByAttendee, saveEntries, addEntry, updateEntry, removeEntry }
}
