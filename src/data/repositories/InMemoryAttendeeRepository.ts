// ─── InMemory Attendee Repository ────────────────────────────────────────────

import { useState, useCallback } from 'react'
import type { IAttendeeRepository } from '../../domain/repositories'
import type { Attendee } from '../../domain/entities'
import { SEED_ATTENDEES } from '../seeds'

export function useAttendeeRepository(): IAttendeeRepository {
  const [all, setAll] = useState<Attendee[]>(SEED_ATTENDEES)

  const getById = useCallback(
    (id: string) => all.find(a => a.id === id),
    [all],
  )

  const add = useCallback((a: Omit<Attendee, 'id'>): Attendee => {
    const item: Attendee = { ...a, id: `a${Date.now()}` }
    setAll(prev => [...prev, item])
    return item
  }, [])

  const update = useCallback((id: string, patch: Partial<Omit<Attendee, 'id'>>): Attendee => {
    let result!: Attendee
    setAll(prev => prev.map(a => {
      if (a.id !== id) return a
      result = { ...a, ...patch }
      return result
    }))
    return result
  }, [])

  const remove = useCallback((id: string) => {
    setAll(prev => prev.filter(a => a.id !== id))
  }, [])

  return { all, getById, add, update, remove }
}
