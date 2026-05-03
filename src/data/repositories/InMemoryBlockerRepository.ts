// ─── InMemory Blocker Repository ────────────────────────────────────────────

import { useState, useCallback } from 'react'
import type { IBlockerRepository } from '../../domain/repositories'
import type { Blocker } from '../../domain/entities'

// Seed data for testing/offline mode
const SEED_BLOCKERS: Blocker[] = [
  {
    id: 'b1',
    project_id: 'p1',
    attendee_id: 'a1',
    reported_date: '2026-04-28',
    reported_by: 'rajesh@company.com',
    description: 'Database migration script timing out on large data volumes',
    severity: 'critical',
    status: 'open',
    resolved_date: null,
    resolved_by: null,
    related_data: { affected_tasks: ['TASK-123'] },
    notes: 'Blocking deployment to staging',
    created_at: new Date('2026-04-28').toISOString(),
    updated_at: new Date('2026-04-28').toISOString(),
  },
  {
    id: 'b2',
    project_id: 'p2',
    attendee_id: 'a2',
    reported_date: '2026-04-29',
    reported_by: 'sarah@company.com',
    description: 'Third-party API rate limiting preventing integration tests',
    severity: 'high',
    status: 'in_progress',
    resolved_date: null,
    resolved_by: null,
    related_data: { vendor: 'Stripe' },
    notes: 'Contacted support team',
    created_at: new Date('2026-04-29').toISOString(),
    updated_at: new Date('2026-04-29').toISOString(),
  },
  {
    id: 'b3',
    project_id: 'p1',
    attendee_id: 'a3',
    reported_date: '2026-04-20',
    reported_by: 'emily@company.com',
    description: 'Missing test infrastructure setup',
    severity: 'medium',
    status: 'resolved',
    resolved_date: '2026-04-26',
    resolved_by: 'admin@company.com',
    related_data: {},
    notes: 'Provisioned new VM',
    created_at: new Date('2026-04-20').toISOString(),
    updated_at: new Date('2026-04-26').toISOString(),
  },
]

export function useBlockerRepository(): IBlockerRepository {
  const [all, setAll] = useState<Blocker[]>(SEED_BLOCKERS)

  const getById = useCallback(
    (id: string) => all.find(b => b.id === id),
    [all],
  )

  const getByProject = useCallback(
    (projectId: string) => all.filter(b => b.project_id === projectId),
    [all],
  )

  const getByAttendee = useCallback(
    (attendeeId: string) => all.filter(b => b.attendee_id === attendeeId),
    [all],
  )

  const getByProjectAndAttendee = useCallback(
    (projectId: string, attendeeId: string) =>
      all.filter(b => b.project_id === projectId && b.attendee_id === attendeeId),
    [all],
  )

  const getByStatus = useCallback(
    (status: 'open' | 'in_progress' | 'resolved') =>
      all.filter(b => b.status === status),
    [all],
  )

  const add = useCallback(
    (blocker: Omit<Blocker, 'id' | 'created_at' | 'updated_at'>) => {
      const newBlocker: Blocker = {
        ...blocker,
        id: `b${Date.now()}`,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }
      setAll(prev => [...prev, newBlocker])
      return newBlocker
    },
    [],
  )

  const update = useCallback(
    (id: string, patch: Partial<Omit<Blocker, 'id'>>) => {
      let updated: Blocker | null = null
      setAll(prev =>
        prev.map(b => {
          if (b.id === id) {
            updated = { ...b, ...patch, updated_at: new Date().toISOString() }
            return updated
          }
          return b
        }),
      )
      return updated || getById(id)!
    },
    [getById],
  )

  const resolve = useCallback(
    (id: string, resolvedBy: string, resolvedDate: string) => {
      let updated: Blocker | null = null
      setAll(prev =>
        prev.map(b => {
          if (b.id === id) {
            updated = {
              ...b,
              status: 'resolved',
              resolved_by: resolvedBy,
              resolved_date: resolvedDate,
              updated_at: new Date().toISOString(),
            }
            return updated
          }
          return b
        }),
      )
      return updated || getById(id)!
    },
    [getById],
  )

  const remove = useCallback((id: string) => {
    setAll(prev => prev.filter(b => b.id !== id))
  }, [])

  return {
    all,
    getById,
    getByProject,
    getByAttendee,
    getByProjectAndAttendee,
    getByStatus,
    add,
    update,
    resolve,
    remove,
  }
}
