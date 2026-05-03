// ─── Blocker ViewModel ────────────────────────────────────────────────────────
import { useMemo, useCallback } from 'react'
import { useContainer } from '../../infrastructure/di/RepositoryProvider'
import type { Blocker } from '../../domain/entities'

export interface BlockerViewModel {
  // Data
  blockers: Blocker[]
  
  // Queries
  getByProjectAndAttendee: (projectId: string, attendeeId: string) => Blocker[]
  getOpenBlockers: (projectId: string, attendeeId: string) => Blocker[]
  getBlockerById: (id: string) => Blocker | undefined
  
  // Metrics
  openCount: (projectId: string) => number
  criticalCount: (projectId: string) => number
  
  // Actions
  createBlocker: (data: {
    projectId: string
    attendeeId: string
    description: string
    severity: 'critical' | 'high' | 'medium' | 'low'
  }) => Blocker
  
  updateBlockerStatus: (
    id: string,
    status: 'open' | 'in_progress' | 'resolved',
  ) => Blocker
  
  resolveBlocker: (id: string, resolvedBy: string) => Blocker
}

export function useBlockerViewModel(): BlockerViewModel {
  const { blockerRepo, projectRepo, attendeeRepo } = useContainer()

  const getByProjectAndAttendee = useCallback(
    (projectId: string, attendeeId: string) =>
      blockerRepo.getByProjectAndAttendee(projectId, attendeeId),
    [blockerRepo],
  )

  const getOpenBlockers = useCallback(
    (projectId: string, attendeeId: string) => {
      const all = getByProjectAndAttendee(projectId, attendeeId)
      return all.filter((b: Blocker) => b.status === 'open' || b.status === 'in_progress')
    },
    [getByProjectAndAttendee],
  )

  const getBlockerById = useCallback(
    (id: string) => blockerRepo.getById(id),
    [blockerRepo],
  )

  // Metrics
  const openCount = useCallback(
    (projectId: string) => {
      return blockerRepo.all.filter(
        (b: Blocker) => b.project_id === projectId && (b.status === 'open' || b.status === 'in_progress'),
      ).length
    },
    [blockerRepo],
  )

  const criticalCount = useCallback(
    (projectId: string) => {
      return blockerRepo.all.filter(
        (b: Blocker) =>
          b.project_id === projectId &&
          b.severity === 'critical' &&
          b.status !== 'resolved',
      ).length
    },
    [blockerRepo],
  )

  // Actions
  const createBlocker = useCallback(
    (data: {
      projectId: string
      attendeeId: string
      description: string
      severity: 'critical' | 'high' | 'medium' | 'low'
    }) => {
      const today = new Date().toISOString().split('T')[0]
      const attendee = attendeeRepo.getById(data.attendeeId)
      const currentUser = 'current_user@company.com' // TODO: Get from auth context

      return blockerRepo.add({
        project_id: data.projectId,
        attendee_id: data.attendeeId,
        reported_date: today,
        reported_by: currentUser,
        description: data.description,
        severity: data.severity,
        status: 'open',
        resolved_date: null,
        resolved_by: null,
        notes: '',
      })
    },
    [blockerRepo, attendeeRepo],
  )

  const updateBlockerStatus = useCallback(
    (id: string, status: 'open' | 'in_progress' | 'resolved') => {
      return blockerRepo.update(id, { status })
    },
    [blockerRepo],
  )

  const resolveBlocker = useCallback(
    (id: string, resolvedBy: string) => {
      const today = new Date().toISOString().split('T')[0]
      return blockerRepo.resolve(id, resolvedBy, today)
    },
    [blockerRepo],
  )

  return {
    blockers: blockerRepo.all,
    getByProjectAndAttendee,
    getOpenBlockers,
    getBlockerById,
    openCount,
    criticalCount,
    createBlocker,
    updateBlockerStatus,
    resolveBlocker,
  }
}
