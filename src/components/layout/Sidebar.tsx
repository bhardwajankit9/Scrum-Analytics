import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard,
  Users,
  FileText,
  Settings,
  UserCheck,
  Download,
  Lock,
  LogOut,
  FolderOpen,
  X,
} from 'lucide-react'
import { useAuth } from '../../infrastructure/di/AuthProvider'
import { usePermissions } from '../../domain/permissions'

import type { Permissions } from '../../domain/permissions'

const navItems = [
  { id: 'dashboard', label: 'Dashboard',  icon: LayoutDashboard, href: '/',          show: (p: Permissions) => p.canViewDashboard  },
  { id: 'projects',  label: 'Projects',   icon: FolderOpen,      href: '/projects', show: (p: Permissions) => p.canViewProjects   },
  { id: 'attendees', label: 'Attendees',  icon: Users,           href: '/attendees',show: (p: Permissions) => p.canViewAttendees  },
  { id: 'reports',   label: 'Reports',    icon: FileText,        href: '/reports',  show: (p: Permissions) => p.canViewReports    },
  { id: 'settings',  label: 'Settings',   icon: Settings,        href: '/settings', show: (p: Permissions) => p.canViewSettings   },
]

const quickActions = [
  { id: 'mark',   label: 'Mark Attendance', icon: UserCheck, href: '/mark',    show: (p: Permissions) => p.canMarkAttendance },
  { id: 'export', label: 'Export Data',     icon: Download,  href: '/reports', show: (p: Permissions) => p.canExportData     },
]

interface SidebarProps {
  onClose?: () => void
}

export default function Sidebar({ onClose }: SidebarProps) {
  const location = useLocation()
  const navigate  = useNavigate()
  const { user, logout } = useAuth()
  const permissions = usePermissions()
  const [showConfirm, setShowConfirm] = useState(false)

  function confirmLogout() {
    void logout().then(() => navigate('/login', { replace: true }))
  }

  const displayName = user?.name  ?? 'Admin User'
  const displayEmail = user?.email ?? user?.mobile ?? 'admin@company.com'
  const initials = displayName.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()

  return (
    <div className="w-56 md:w-44 bg-white border-r border-gray-200 flex flex-col shrink-0 h-screen sticky top-0">
      {/* Logo */}
      <div className="p-4 border-b border-gray-100">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-gray-900 rounded-lg flex items-center justify-center shrink-0">
              <Lock className="w-4 h-4 text-white" />
            </div>
            <div className="leading-tight">
              <span className="text-sm font-bold text-gray-900">Scrum<br />Analytics.</span>
            </div>
          </div>
          {/* Close button — mobile only */}
          <button
            onClick={onClose}
            className="md:hidden p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-700 transition-colors touch-manipulation"
            aria-label="Close sidebar"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        <p className="mt-1.5 text-[10px] font-semibold uppercase tracking-widest text-gray-400">
          Dashboard
        </p>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-2 overflow-y-auto">
        <ul className="space-y-0.5">
          {navItems.filter(item => item.show(permissions)).map((item) => {
            const Icon = item.icon
            const isActive = location.pathname === item.href
            return (
              <li key={item.id}>
                <Link
                  to={item.href}
                  onClick={onClose}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                    isActive
                      ? 'bg-gray-900 text-white'
                      : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5 shrink-0" />
                  <span className="leading-tight">{item.label}</span>
                </Link>
              </li>
            )
          })}
        </ul>

        {/* Quick Actions */}
        <div className="mt-5">
          <p className="px-3 text-[10px] font-semibold uppercase tracking-widest text-gray-400 mb-1">
            Quick Actions
          </p>
          <ul className="space-y-0.5">
            {quickActions.filter(a => a.show(permissions)).map((action) => {
              const Icon = action.icon
              return (
                <li key={action.id}>
                  <Link
                    to={action.href}
                    onClick={onClose}
                    className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium text-gray-600 hover:bg-gray-100 hover:text-gray-900 transition-colors"
                  >
                    <Icon className="w-3.5 h-3.5 shrink-0" />
                    <span>{action.label}</span>
                  </Link>
                </li>
              )
            })}
          </ul>
        </div>
      </nav>

      {/* User profile + logout */}
      <div className="border-t border-gray-100 p-3 space-y-1">
        <Link to="/profile" className="flex items-center gap-2 min-w-0 hover:opacity-80 transition-opacity">
          <div className="w-7 h-7 rounded-full bg-gray-800 flex items-center justify-center shrink-0 text-xs font-semibold text-white">
            {initials}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-medium text-gray-900 truncate">{displayName}</p>
            <p className="text-[10px] text-gray-400 truncate">{displayEmail}</p>
          </div>
        </Link>
        <button
          onClick={() => setShowConfirm(true)}
          className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-xs font-medium text-red-500 hover:bg-red-50 hover:text-red-600 transition-colors"
        >
          <LogOut className="w-3.5 h-3.5 shrink-0" />
          <span>Sign out</span>
        </button>
      </div>

      {/* Logout confirmation dialog */}
      {showConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={() => setShowConfirm(false)}
          />
          {/* Dialog */}
          <div className="relative bg-white rounded-2xl shadow-2xl border border-gray-100 w-full max-w-xs p-6 flex flex-col items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center">
              <LogOut className="w-5 h-5 text-red-500" />
            </div>
            <div className="text-center">
              <p className="text-sm font-bold text-gray-900">Sign out?</p>
              <p className="text-xs text-gray-500 mt-1">You'll need to verify your MPIN on next login.</p>
            </div>
            <div className="flex gap-2 w-full">
              <button
                onClick={() => setShowConfirm(false)}
                className="flex-1 h-9 rounded-xl border border-gray-200 text-xs font-semibold text-gray-600 hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={confirmLogout}
                className="flex-1 h-9 rounded-xl bg-red-500 text-white text-xs font-semibold hover:bg-red-600 transition-colors"
              >
                Sign out
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
