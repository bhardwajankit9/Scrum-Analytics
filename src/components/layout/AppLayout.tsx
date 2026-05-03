import { useState } from 'react'
import { Outlet, useLocation, useNavigate } from 'react-router-dom'
import { Menu, MessageCircle, X } from 'lucide-react'
import Sidebar from './Sidebar'
import PWAInstallPrompt from '../ui/PWAInstallPrompt'
import { ChatPanel } from '../chat/ChatPanel'
// NotificationBell moved to per-screen placement to avoid duplicate icons
import { useScrumReminderNotification } from '../../hooks/useScrumReminderNotification'

export default function AppLayout() {
  const navigate = useNavigate()
  const location = useLocation()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [chatOpen,    setChatOpen]    = useState(false)
  const showDashboardChat = location.pathname === '/'
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

      {/* ── Floating AI Chat button ─────────────────────────────────── */}
      {showDashboardChat && (
        <>
          <button
            onClick={() => setChatOpen(o => !o)}
            title={chatOpen ? 'Close AI Assistant' : 'Open AI Assistant'}
            className="
              fixed bottom-5 right-5 z-50
              w-13 h-13 flex items-center justify-center
              bg-gradient-to-br from-indigo-500 to-purple-600
              hover:from-indigo-600 hover:to-purple-700
              text-white rounded-2xl shadow-lg hover:shadow-xl
              transition-all duration-200 active:scale-95
              md:bottom-5 md:right-5
            "
            style={{ width: '52px', height: '52px' }}
          >
            {chatOpen
              ? <X className="w-5 h-5" />
              : <MessageCircle className="w-5 h-5" />}

            {/* Pulse ring when closed */}
            {!chatOpen && (
              <span className="absolute inset-0 rounded-2xl animate-ping bg-indigo-400 opacity-30 pointer-events-none" />
            )}
          </button>

          {/* ── Chat drawer ────────────────────────────────────────────── */}
          <ChatPanel open={chatOpen} onClose={() => setChatOpen(false)} />
        </>
      )}
    </div>
  )
}
