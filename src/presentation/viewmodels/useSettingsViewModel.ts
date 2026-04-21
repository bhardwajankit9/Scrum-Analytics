// ─── Settings ViewModel ───────────────────────────────────────────────────────
import { useCallback } from 'react'
import { useContainer } from '../../infrastructure/di/RepositoryProvider'
import type { Project, Attendee, Holiday, Leave, ProjectMembership } from '../../domain/entities'

export interface SettingsViewModel {
  projects:    Project[]
  attendees:   Attendee[]
  holidays:    Holiday[]
  leaves:      Leave[]
  memberships: ProjectMembership[]
  updateProject:     (id: string, partial: Partial<Omit<Project, 'id'>>) => Project
  addHoliday:        (h: Omit<Holiday, 'id'>) => Holiday
  removeHoliday:     (id: string) => void
  addLeave:          (l: Omit<Leave, 'id' | 'created_at'>) => Leave
  removeLeave:       (id: string) => void
  addMembership:     (m: Omit<ProjectMembership, 'id'>) => ProjectMembership
  removeMembership:  (id: string) => void
}

export function useSettingsViewModel(): SettingsViewModel {
  const { projectRepo, attendeeRepo, holidayRepo, leaveRepo, membershipRepo } = useContainer()

  const updateProject    = useCallback((id: string, p: Partial<Omit<Project, 'id'>>) => projectRepo.update(id, p),   [projectRepo])
  const addHoliday       = useCallback((h: Omit<Holiday, 'id'>) => holidayRepo.add(h),                               [holidayRepo])
  const removeHoliday    = useCallback((id: string) => holidayRepo.remove(id),                                        [holidayRepo])
  const addLeave         = useCallback((l: Omit<Leave, 'id' | 'created_at'>) => leaveRepo.add({ ...l, created_at: new Date().toISOString() }),  [leaveRepo])
  const removeLeave      = useCallback((id: string) => leaveRepo.remove(id),                                          [leaveRepo])
  const addMembership    = useCallback((m: Omit<ProjectMembership, 'id'>) => membershipRepo.add(m),                   [membershipRepo])
  const removeMembership = useCallback((id: string) => membershipRepo.remove(id),                                     [membershipRepo])

  return {
    projects:    projectRepo.all,
    attendees:   attendeeRepo.all,
    holidays:    holidayRepo.all,
    leaves:      leaveRepo.all,
    memberships: membershipRepo.all,
    updateProject, addHoliday, removeHoliday, addLeave, removeLeave, addMembership, removeMembership,
  }
}
