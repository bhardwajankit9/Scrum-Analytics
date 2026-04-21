import { useState, useCallback } from 'react'
import type { ILeaveRepository } from '../../domain/repositories'
import type { Leave } from '../../domain/entities'
import { SEED_LEAVES } from '../seeds'

export function useLeaveRepository(): ILeaveRepository {
  const [all, setAll] = useState<Leave[]>(SEED_LEAVES)

  const getByAttendee = useCallback(
    (attendeeId: string) => all.filter(l => l.attendee_id === attendeeId),
    [all],
  )

  const add = useCallback((l: Omit<Leave, 'id'>): Leave => {
    const item: Leave = { ...l, id: `l${Date.now()}`, created_at: new Date().toISOString() }
    setAll(prev => [...prev, item])
    return item
  }, [])

  const remove = useCallback((id: string) => {
    setAll(prev => prev.filter(l => l.id !== id))
  }, [])

  return { all, getByAttendee, add, remove }
}
