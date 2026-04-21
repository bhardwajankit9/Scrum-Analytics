// ─── Supabase Project Repository ─────────────────────────────────────────────
// Loads from Supabase on mount. Mutations use optimistic updates (instant UI)
// then persist to Supabase in the background.

import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../../lib/supabase/client'
import type { IProjectRepository } from '../../domain/repositories'
import type { Project } from '../../domain/entities'
import type { ProjectRow } from '../../lib/supabase/database.types'
import type { Database } from '../../lib/supabase/database.types'
type ProjectUpdate = Database['public']['Tables']['projects']['Update']

function rowToProject(r: ProjectRow): Project {
  return {
    id:                 r.id,
    name:               r.name,
    description:        r.description,
    scrum_time:         r.scrum_time,
    scrum_timezone:     r.scrum_timezone,
    status:             r.status,
    late_grace_minutes: r.late_grace_minutes,
  }
}

export function useProjectRepository(): IProjectRepository & { loading: boolean } {
  const [all, setAll] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.from('projects').select('*').order('created_at').then(({ data, error }) => {
      if (error) { console.error('[ProjectRepo]', error.message) }
      if (data)  setAll((data as ProjectRow[]).map(rowToProject))
      setLoading(false)
    })
  }, [])

  const getById = useCallback((id: string) => all.find(p => p.id === id), [all])

  const add = useCallback((p: Omit<Project, 'id'>): Project => {
    const tempId = `_tmp_${Date.now()}`
    const optimistic: Project = { ...p, id: tempId }
    setAll(prev => [...prev, optimistic])

    supabase.from('projects').insert({
      name: p.name, description: p.description, scrum_time: p.scrum_time,
      scrum_timezone: p.scrum_timezone, status: p.status,
      late_grace_minutes: p.late_grace_minutes,
    }).select().single().then(({ data, error }) => {
      if (error) { console.error('[ProjectRepo] insert:', error.message); setAll(prev => prev.filter(x => x.id !== tempId)); return }
      if (data)  setAll(prev => prev.map(x => x.id === tempId ? rowToProject(data as ProjectRow) : x))
    })
    return optimistic
  }, [])

  const update = useCallback((id: string, patch: Partial<Omit<Project, 'id'>>): Project => {
    let result!: Project
    setAll(prev => prev.map(p => {
      if (p.id !== id) return p
      result = { ...p, ...patch }
      return result
    }))
    supabase.from('projects').update(patch as ProjectUpdate).eq('id', id)
      .then(({ error }) => { if (error) console.error('[ProjectRepo] update:', error.message) })
    return result
  }, [])

  return { all, loading, getById, add, update }
}
