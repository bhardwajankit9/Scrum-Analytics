import { useState, useCallback } from 'react'
import type { IMembershipRepository } from '../../domain/repositories'
import type { ProjectMembership } from '../../domain/entities'
import { SEED_MEMBERSHIPS } from '../seeds'

export function useMembershipRepository(): IMembershipRepository {
  const [all, setAll] = useState<ProjectMembership[]>(SEED_MEMBERSHIPS)

  const getByProject = useCallback(
    (projectId: string) => all.filter(m => m.project_id === projectId),
    [all],
  )

  const add = useCallback((m: Omit<ProjectMembership, 'id'>): ProjectMembership => {
    const item: ProjectMembership = { ...m, id: `m${Date.now()}` }
    setAll(prev => [...prev, item])
    return item
  }, [])

  const remove = useCallback((id: string) => {
    setAll(prev => prev.filter(m => m.id !== id))
  }, [])

  return { all, getByProject, add, remove }
}
