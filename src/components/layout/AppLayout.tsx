import { useState } from 'react'
import { Outlet, useNavigate } from 'react-router-dom'
import { Menu } from 'lucide-react'
import Sidebar from './Sidebar'
import PWAInstallPrompt from '../ui/PWAInstallPrompt'
// NotificationBell moved to per-screen placement to avoid duplicate icons
import { useScrumReminderNotification } from '../../hooks/useScrumReminderNotification'

export default function AppLayout() {
  const navigate = useNavigate()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  useScrumReminderNotification(() => navigate('/mark'))

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      {/* Mobile overlay backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/40 backdrop-blur-sm md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar — always visible on md+, slide-in on mobile */}
      <div
        className={`
          fixed inset-y-0 left-0 z-40 transition-transform duration-300 ease-in-out
          md:static md:translate-x-0 md:z-auto
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
        `}
      >
        <Sidebar onClose={() => setSidebarOpen(false)} />
      </div>

      {/* Main content area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Unified top bar — single NotificationBell instance (no duplicate hooks) */}
        <header className="flex items-center gap-2 px-4 md:px-5 h-14 md:h-11 bg-gray-50 border-b border-gray-100 shrink-0">
          {/* Hamburger — mobile only */}
          <button
            onClick={() => setSidebarOpen(true)}
            className="md:hidden p-2 rounded-lg text-gray-500 hover:bg-gray-100 active:bg-gray-200 transition-colors touch-manipulation"
            aria-label="Open menu"
          >
            <Menu className="w-5 h-5" />
          </button>
          {/* App name — mobile only */}
          <span className="md:hidden text-sm font-bold text-gray-900 flex-1">Scrum Analytics</span>
          {/* Push bell to the right on desktop */}
          <div className="hidden md:flex flex-1" />
          {/* Bell moved to individual screens to avoid duplicate icons; keep spacer for layout */}
          <div className="w-9 h-9" />
        </header>

        <div className="flex-1 overflow-y-auto">
          <Outlet />
        </div>
      </div>

      <PWAInstallPrompt />
    </div>
  )
}
