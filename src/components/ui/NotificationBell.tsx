import { useRef, useState, useEffect } from 'react'
import { Bell, X, CheckCheck, Clock } from 'lucide-react'
import { useNotifications } from '../../hooks/useNotifications'

const ALERT_ICONS: Record<string, string> = {
  attendance_reminder: '⏰',
  attendance_summary:  '📊',
  late_arrival:        '⚠️',
  high_absenteeism:    '📉',
  leave_approval:      '📋',
}

const ALERT_COLOR: Record<string, string> = {
  attendance_reminder: 'bg-amber-100 text-amber-600',
  attendance_summary:  'bg-blue-100 text-blue-600',
  late_arrival:        'bg-orange-100 text-orange-600',
  high_absenteeism:    'bg-red-100 text-red-600',
  leave_approval:      'bg-violet-100 text-violet-600',
}

function timeAgo(iso: string): string {
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000)
  if (diff < 60)   return `${diff}s ago`
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
  return new Date(iso).toLocaleDateString()
}

export default function NotificationBell() {
  const { notifications, unreadCount, markAsRead, dismiss, markAllAsRead, loading, error } = useNotifications()
  const [open, setOpen] = useState(false)
  const panelRef = useRef<HTMLDivElement>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)

  // Close dropdown on outside click
  useEffect(() => {
    if (!open) return
    function handler(e: MouseEvent) {
      if (
        panelRef.current && !panelRef.current.contains(e.target as Node) &&
        buttonRef.current && !buttonRef.current.contains(e.target as Node)
      ) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  return (
    <div className="relative">
      {/* Bell Button */}
      <button
        ref={buttonRef}
        onClick={() => setOpen(v => !v)}
        className="relative p-2 rounded-lg text-gray-500 hover:bg-gray-100 hover:text-gray-700 transition-colors touch-manipulation"
        aria-label="Notifications"
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 min-w-[16px] h-4 px-0.5 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center leading-none">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown Panel */}
      {open && (
        <div
          ref={panelRef}
          className="absolute right-0 mt-2 w-96 max-h-[520px] bg-white border border-gray-200 rounded-2xl shadow-2xl overflow-hidden z-50 flex flex-col"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 shrink-0">
            <div className="flex items-center gap-2">
              <Bell className="w-4 h-4 text-gray-600" />
              <h3 className="text-sm font-bold text-gray-900">Notifications</h3>
              {unreadCount > 0 && (
                <span className="px-1.5 py-0.5 bg-red-100 text-red-600 text-[10px] font-bold rounded-full">
                  {unreadCount} new
                </span>
              )}
            </div>
            {unreadCount > 0 && (
              <button
                onClick={() => void markAllAsRead()}
                className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700 font-medium"
              >
                <CheckCheck className="w-3.5 h-3.5" />
                Mark all read
              </button>
            )}
          </div>

          {/* List */}
          <div className="overflow-y-auto flex-1">
            {loading ? (
              <div className="py-8 text-center text-gray-400">
                <Bell className="w-6 h-6 mx-auto mb-2 opacity-50" />
                <p className="text-sm">Loading notifications...</p>
              </div>
            ) : error ? (
              <div className="py-8 text-center text-gray-400">
                <Bell className="w-6 h-6 mx-auto mb-2 opacity-50" />
                <p className="text-sm">Unable to load notifications</p>
                <p className="text-xs">{error}</p>
              </div>
            ) : notifications.length === 0 ? (
              <div className="py-12 flex flex-col items-center gap-2 text-gray-400">
                <Bell className="w-8 h-8 opacity-30" />
                <p className="text-sm">No notifications yet</p>
                <p className="text-xs">Scrum reminders will appear here</p>
              </div>
            ) : (
              notifications.map(n => {
                const iconClass = ALERT_COLOR[n.alert_type] ?? 'bg-gray-100 text-gray-500'
                const icon      = ALERT_ICONS[n.alert_type] ?? '📬'
                return (
                  <div
                    key={n.id}
                    onClick={() => void markAsRead(n.id)}
                    className={`flex items-start gap-3 px-4 py-3 cursor-pointer hover:bg-gray-50 border-b border-gray-50 transition-colors ${
                      !n.is_read ? 'bg-blue-50/40' : ''
                    }`}
                  >
                    {/* Icon */}
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm shrink-0 mt-0.5 ${iconClass}`}>
                      {icon}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-1">
                        <p className={`text-sm leading-tight ${n.is_read ? 'font-medium text-gray-700' : 'font-semibold text-gray-900'}`}>
                          {n.title}
                        </p>
                        <button
                          onClick={e => { e.stopPropagation(); void dismiss(n.id) }}
                          className="text-gray-300 hover:text-gray-500 transition-colors shrink-0 p-0.5"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{n.message}</p>
                      <div className="flex items-center gap-1 mt-1.5">
                        <Clock className="w-3 h-3 text-gray-300" />
                        <span className="text-[10px] text-gray-400">{timeAgo(n.created_at)}</span>
                        {!n.is_read && (
                          <span className="ml-1 w-1.5 h-1.5 bg-blue-500 rounded-full" />
                        )}
                      </div>
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </div>
      )}
    </div>
  )
}
