import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom'
import type { ReactNode } from 'react'
import AppLayout from './components/layout/AppLayout'
import LoginScreen from './screens/LoginScreen'
import AccessDeniedScreen from './screens/AccessDeniedScreen'
import { useAuth } from './infrastructure/di/AuthProvider'
import { RepositoryProvider } from './infrastructure/di/RepositoryProvider'
import type { UserRole } from './domain/entities/auth'
import DashboardScreen from './screens/DashboardScreen'
import AttendeeDirectoryScreen from './screens/AttendeeDirectoryScreen'
import AttendeeProfileScreen from './screens/AttendeeProfileScreen'
import DetailedReportsScreen from './screens/DetailedReportsScreen'
import SystemSettingsScreen from './screens/SystemSettingsScreen'
import MarkAttendanceScreen from './screens/MarkAttendanceScreen'
import ProjectsScreen from './screens/ProjectsScreen'
import AdminProfileScreen from './screens/AdminProfileScreen'

/** Redirect to /login if not authenticated. */
function RequireAuth({ children }: { children: ReactNode }) {
  const { session } = useAuth()
  return session ? <>{children}</> : <Navigate to="/login" replace />
}

/**
 * Layout route guard — renders nested <Outlet /> if role is allowed,
 * otherwise redirects to /access-denied.
 *
 * By the time this renders, initializing=false and the session+role are fully
 * resolved (AuthProvider awaits buildAuthUser before clearing initializing).
 * Used as: <Route element={<RequireRole allow={[...]} />}>
 */
function RequireRole({ allow }: { allow: UserRole[] }) {
  const { user } = useAuth()
  const role = (user?.role ?? 'none') as UserRole
  return allow.includes(role) ? <Outlet /> : <Navigate to="/access-denied" replace />
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginScreen />} />
        <Route path="/access-denied" element={<AccessDeniedScreen />} />

        <Route element={<RequireAuth><RepositoryProvider><AppLayout /></RepositoryProvider></RequireAuth>}>
          {/* All authenticated non-none roles */}
          <Route element={<RequireRole allow={['owner_pmo','pmo','viewer']} />}>
            <Route path="/" element={<DashboardScreen />} />
            <Route path="/projects" element={<ProjectsScreen />} />
            <Route path="/attendees" element={<AttendeeDirectoryScreen />} />
            <Route path="/attendees/:id" element={<AttendeeProfileScreen />} />
            <Route path="/reports" element={<DetailedReportsScreen />} />
            <Route path="/profile" element={<AdminProfileScreen />} />
          </Route>

          {/* PMO + Owner only */}
          <Route element={<RequireRole allow={['owner_pmo','pmo']} />}>
            <Route path="/mark" element={<MarkAttendanceScreen />} />
          </Route>

          {/* Owner only */}
          <Route element={<RequireRole allow={['owner_pmo']} />}>
            <Route path="/settings" element={<SystemSettingsScreen />} />
          </Route>
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
