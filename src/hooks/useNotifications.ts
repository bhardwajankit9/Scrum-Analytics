import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase/client'
import { useAuth } from '../infrastructure/di/AuthProvider'
import type { NotificationRow } from '../lib/supabase/database.types'

export type AppNotification = NotificationRow

export function useNotifications() {
  const { user } = useAuth()
  const [notifications, setNotifications] = useState<AppNotification[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchNotifications = useCallback(async () => {
    if (!user?.id) { setLoading(false); return }
    try {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('is_dismissed', false)
        .order('created_at', { ascending: false })
        .limit(30)
      
      if (error) {
        console.warn('[useNotifications] Table may not exist:', error.message)
        setError(error.message)
        setNotifications([])
      } else {
        setError(null)
        setNotifications((data ?? []) as AppNotification[])
      }
    } catch (e) {
      console.warn('[useNotifications] Fetch failed:', e)
      setError('Failed to load notifications')
      setNotifications([])
    } finally {
      setLoading(false)
    }
  }, [user?.id])

  useEffect(() => {
    void fetchNotifications()

    // Guard: only subscribe to realtime after we confirm the table exists.
    // If the initial fetch returned an error (table missing / RLS), skip the
    // subscription entirely to avoid a secondary crash.
    let channel: ReturnType<typeof supabase.channel> | null = null
    try {
      channel = supabase
        .channel('app-notifications')
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .on('postgres_changes' as any,
          { event: 'INSERT', schema: 'public', table: 'notifications' },
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (payload: any) => {
            try {
              setNotifications(prev => [payload.new as AppNotification, ...prev])
            } catch { /* ignore malformed payload */ }
          }
        )
        .subscribe()
    } catch (e) {
      console.warn('[useNotifications] Realtime subscription failed:', e)
    }

    return () => {
      if (channel) { void supabase.removeChannel(channel) }
    }
  }, [fetchNotifications])

  async function markAsRead(id: string) {
    try {
      await supabase.from('notifications')
        .update({ is_read: true, read_at: new Date().toISOString() } as Partial<AppNotification>)
        .eq('id', id)
    } catch { /* silent */ }
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n))
  }

  async function dismiss(id: string) {
    try {
      await supabase.from('notifications')
        .update({ is_dismissed: true } as Partial<AppNotification>)
        .eq('id', id)
    } catch { /* silent */ }
    setNotifications(prev => prev.filter(n => n.id !== id))
  }

  async function markAllAsRead() {
    const unreadIds = notifications.filter(n => !n.is_read).map(n => n.id)
    if (unreadIds.length === 0) return
    try {
      await supabase.from('notifications')
        .update({ is_read: true } as Partial<AppNotification>)
        .in('id', unreadIds)
    } catch { /* silent */ }
    setNotifications(prev => prev.map(n => ({ ...n, is_read: true })))
  }

  const unreadCount = notifications.filter(n => !n.is_read).length

  return { notifications, loading, error, unreadCount, markAsRead, dismiss, markAllAsRead, refresh: fetchNotifications }
}
