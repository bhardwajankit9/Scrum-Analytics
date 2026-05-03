// ─── Supabase Blocker Repository ────────────────────────────────────────────
import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../../lib/supabase/client'
import type { IBlockerRepository } from '../../domain/repositories'
import type { Blocker } from '../../domain/entities'
import type { BlockerRow } from '../../lib/supabase/database.types'

function toEntity(r: BlockerRow): Blocker {
  return {
    id: r.id,
    project_id: r.project_id,
    attendee_id: r.attendee_id,
    reported_date: r.reported_date,
    reported_by: r.reported_by,
    description: r.description,
    severity: r.severity,
    status: r.status,
    resolved_date: r.resolved_date,
    resolved_by: r.resolved_by,
    related_data: r.related_data || undefined,
    notes: r.notes,
    created_at: r.created_at,
    updated_at: r.updated_at,
  }
}

export function useBlockerRepository(): IBlockerRepository {
  const [all, setAll] = useState<Blocker[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.from('blockers')
      .select('*')
      .order('created_at', { ascending: false })
      .then(({ data, error }) => {
        if (error) {
          console.error('[BlockerRepo]', error.message)
        } else if (data) {
          setAll((data as BlockerRow[]).map(toEntity))
        }
        setLoading(false)
      })
  }, [])

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
      const now = new Date().toISOString()
      const newBlocker: Blocker = {
        ...blocker,
        id: `temp_${Date.now()}`,
        created_at: now,
        updated_at: now,
      }

      // Optimistic update
      setAll(prev => [newBlocker, ...prev])

      // Persist to Supabase
      supabase.from('blockers')
        .insert({
          project_id: blocker.project_id,
          attendee_id: blocker.attendee_id,
          reported_date: blocker.reported_date,
          reported_by: blocker.reported_by,
          description: blocker.description,
          severity: blocker.severity,
          status: blocker.status,
          resolved_date: blocker.resolved_date,
          resolved_by: blocker.resolved_by,
          related_data: blocker.related_data,
          notes: blocker.notes,
        } as unknown as BlockerRow)
        .select()
        .single()
        .then(({ data, error }) => {
          if (error) {
            console.error('[BlockerRepo] add:', error.message)
            // Roll back optimistic update
            setAll(prev => prev.filter(b => b.id !== newBlocker.id))
            return
          }
          if (data) {
            const saved = toEntity(data)
            setAll(prev =>
              prev.map(b => (b.id === newBlocker.id ? saved : b)),
            )
          }
        })

      return newBlocker
    },
    [],
  )

  const update = useCallback(
    (id: string, patch: Partial<Omit<Blocker, 'id'>>) => {
      const updatedAt = new Date().toISOString()
      let updated: Blocker | null = null

      // Optimistic update
      setAll(prev =>
        prev.map(b => {
          if (b.id === id) {
            updated = { ...b, ...patch, updated_at: updatedAt }
            return updated
          }
          return b
        }),
      )

      // Persist to Supabase
      supabase.from('blockers')
        .update({ ...patch, updated_at: updatedAt } as unknown as Partial<BlockerRow>)
        .eq('id', id)
        .select()
        .single()
        .then(({ data, error }) => {
          if (error) {
            console.error('[BlockerRepo] update:', error.message)
            // Rollback - re-fetch
            supabase.from('blockers')
              .select('*')
              .eq('id', id)
              .single()
              .then(({ data: freshData }) => {
                if (freshData) {
                  setAll(prev =>
                    prev.map(b => (b.id === id ? toEntity(freshData) : b)),
                  )
                }
              })
            return
          }
          if (data) {
            const saved = toEntity(data)
            setAll(prev => prev.map(b => (b.id === id ? saved : b)))
          }
        })

      return updated || getById(id)!
    },
    [getById],
  )

  const resolve = useCallback(
    (id: string, resolvedBy: string, resolvedDate: string) => {
      const updatedAt = new Date().toISOString()
      let updated: Blocker | null = null

      // Optimistic update
      setAll(prev =>
        prev.map(b => {
          if (b.id === id) {
            updated = {
              ...b,
              status: 'resolved',
              resolved_by: resolvedBy,
              resolved_date: resolvedDate,
              updated_at: updatedAt,
            }
            return updated
          }
          return b
        }),
      )

      // Persist to Supabase
      supabase.from('blockers')
        .update({
          status: 'resolved',
          resolved_by: resolvedBy,
          resolved_date: resolvedDate,
          updated_at: updatedAt,
        } as unknown as Partial<BlockerRow>)
        .eq('id', id)
        .select()
        .single()
        .then(({ data, error }) => {
          if (error) {
            console.error('[BlockerRepo] resolve:', error.message)
            return
          }
          if (data) {
            const saved = toEntity(data)
            setAll(prev => prev.map(b => (b.id === id ? saved : b)))
          }
        })

      return updated || getById(id)!
    },
    [getById],
  )

  const remove = useCallback((id: string) => {
    // Optimistic delete
    setAll(prev => prev.filter(b => b.id !== id))

    // Persist deletion
    supabase.from('blockers')
      .delete()
      .eq('id', id)
      .then(({ error }) => {
        if (error) {
          console.error('[BlockerRepo] remove:', error.message)
          // Rollback - re-fetch
          supabase.from('blockers')
            .select('*')
            .eq('id', id)
            .single()
            .then(({ data }) => {
              if (data) {
                setAll(prev => [...prev, toEntity(data)])
              }
            })
        }
      })
  }, [])

  return {
    all,
    loading,
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
