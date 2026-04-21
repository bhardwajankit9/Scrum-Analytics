// ─── Supabase Membership Repository ──────────────────────────────────────────
import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../../lib/supabase/client'
import type { IMembershipRepository } from '../../domain/repositories'
import type { ProjectMembership } from '../../domain/entities'
import type { ProjectMembershipRow } from '../../lib/supabase/database.types'

function toEntity(r: ProjectMembershipRow): ProjectMembership {
  return { id: r.id, project_id: r.project_id, user_name: r.user_name,
           user_email: r.user_email, role: r.role }
}

export function useMembershipRepository(): IMembershipRepository {
  const [all, setAll] = useState<ProjectMembership[]>([])

  useEffect(() => {
    supabase.from('project_memberships').select('*').order('created_at').then(({ data, error }) => {
      if (error) { console.error('[MembershipRepo]', error.message); return }
      if (data)  setAll((data as ProjectMembershipRow[]).map(toEntity))
    })
  }, [])

  const getByProject = useCallback((projectId: string) => all.filter(m => m.project_id === projectId), [all])

  const add = useCallback((m: Omit<ProjectMembership, 'id'>): ProjectMembership => {
    const tempId = `_tmp_${Date.now()}`
    const optimistic: ProjectMembership = { ...m, id: tempId }
    setAll(prev => [...prev, optimistic])
    supabase.from('project_memberships').insert(m as unknown as ProjectMembershipRow).select().single()
      .then(({ data, error }) => {
        if (error) { console.error('[MembershipRepo] insert:', error.message); setAll(prev => prev.filter(x => x.id !== tempId)); return }
        if (data)  setAll(prev => prev.map(x => x.id === tempId ? toEntity(data as ProjectMembershipRow) : x))
      })
    return optimistic
  }, [])

  const remove = useCallback((id: string) => {
    setAll(prev => prev.filter(m => m.id !== id))
    supabase.from('project_memberships').delete().eq('id', id)
      .then(({ error }) => { if (error) console.error('[MembershipRepo] delete:', error.message) })
  }, [])

  return { all, getByProject, add, remove }
}
