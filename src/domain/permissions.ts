// ─── Permission Matrix ────────────────────────────────────────────────────────
// Single source of truth for what each role can do.
// Used by route guards, sidebar, and UI action gating.

import { useAuth } from '../infrastructure/di/AuthProvider'
import type { UserRole } from './entities/auth'

export interface Permissions {
  // Navigation
  canViewDashboard:     boolean
  canViewProjects:      boolean
  canViewAttendees:     boolean
  canViewReports:       boolean
  canViewSettings:      boolean

  // Actions
  canMarkAttendance:    boolean
  canExportData:        boolean
  canManageProjects:    boolean   // create / edit / archive projects
  canManageAttendees:   boolean   // add / edit / deactivate attendees
  canManageHolidays:    boolean   // add / remove holidays & leaves
  canManageMembers:     boolean   // assign roles to users
  canDeleteData:        boolean   // delete any record
}

const MATRIX: Record<UserRole, Permissions> = {
  owner_pmo: {
    canViewDashboard:   true,
    canViewProjects:    true,
    canViewAttendees:   true,
    canViewReports:     true,
    canViewSettings:    true,
    canMarkAttendance:  true,
    canExportData:      true,
    canManageProjects:  true,
    canManageAttendees: true,
    canManageHolidays:  true,
    canManageMembers:   true,
    canDeleteData:      true,
  },
  pmo: {
    canViewDashboard:   true,
    canViewProjects:    true,
    canViewAttendees:   true,
    canViewReports:     true,
    canViewSettings:    false,
    canMarkAttendance:  true,
    canExportData:      true,
    canManageProjects:  false,
    canManageAttendees: true,
    canManageHolidays:  true,
    canManageMembers:   false,
    canDeleteData:      false,
  },
  viewer: {
    canViewDashboard:   true,
    canViewProjects:    true,
    canViewAttendees:   true,
    canViewReports:     true,
    canViewSettings:    false,
    canMarkAttendance:  false,
    canExportData:      false,
    canManageProjects:  false,
    canManageAttendees: false,
    canManageHolidays:  false,
    canManageMembers:   false,
    canDeleteData:      false,
  },
  none: {
    canViewDashboard:   false,
    canViewProjects:    false,
    canViewAttendees:   false,
    canViewReports:     false,
    canViewSettings:    false,
    canMarkAttendance:  false,
    canExportData:      false,
    canManageProjects:  false,
    canManageAttendees: false,
    canManageHolidays:  false,
    canManageMembers:   false,
    canDeleteData:      false,
  },
}

export function getPermissions(role: UserRole): Permissions {
  return MATRIX[role] ?? MATRIX['none']
}

/** React hook — use inside any component to read current user's permissions. */
export function usePermissions(): Permissions {
  const { user } = useAuth()
  return getPermissions((user?.role ?? 'none') as UserRole)
}
