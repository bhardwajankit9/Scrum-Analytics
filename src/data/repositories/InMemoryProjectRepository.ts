// ─── InMemory Project Repository ─────────────────────────────────────────────
// Implements IProjectRepository using React useState.
// Swap for a Supabase/REST implementation without touching any ViewModel or screen.

import { useState, useCallback } from 'react'
import type { IProjectRepository } from '../../domain/repositories'
import type { Project } from '../../domain/entities'
import { SEED_PROJECTS } from '../seeds'

export function useProjectRepository(): IProjectRepository {
  const [all, setAll] = useState<Project[]>(SEED_PROJECTS)

  const getById = useCallback(
    (id: string) => all.find(p => p.id === id),
    [all],
  )

  const add = useCallback((p: Omit<Project, 'id'>): Project => {
    const item: Project = { ...p, id: `p${Date.now()}` }
    setAll(prev => [...prev, item])
    return item
  }, [])

  const update = useCallback((id: string, patch: Partial<Omit<Project, 'id'>>): Project => {
    let result!: Project
    setAll(prev => prev.map(p => {
      if (p.id !== id) return p
      result = { ...p, ...patch }
      return result
    }))
    return result
  }, [])

  return { all, getById, add, update }
}
