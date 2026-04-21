// ─── Projects ViewModel ───────────────────────────────────────────────────────
import { useMemo, useCallback } from 'react'
import { useContainer } from '../../infrastructure/di/RepositoryProvider'
import type { Attendee, Project } from '../../domain/entities'

export interface ProjectViewModel {
  projects:          Project[]
  attendees:         Attendee[]
  attendanceRecords: import('../../domain/entities').AttendanceEntry[]
  activeCount:  number
  archivedCount:number
  memberCount:  (projectId: string) => number
  addProject:    (p: Omit<Project, 'id'>) => Project
  updateProject: (id: string, partial: Partial<Omit<Project, 'id'>>) => Project
  archiveProject:(id: string) => Project
  restoreProject:(id: string) => Project
  dataLoading:   boolean
}

export function useProjectViewModel(): ProjectViewModel {
  const { projectRepo, attendeeRepo, attendanceRepo } = useContainer()

  const activeCount   = useMemo(() => projectRepo.all.filter(p => p.status === 'active').length,   [projectRepo.all])
  const archivedCount = useMemo(() => projectRepo.all.filter(p => p.status === 'archived').length, [projectRepo.all])

  const memberCount = useCallback(
    (projectId: string) => attendeeRepo.all.filter(a => {
      const proj = projectRepo.all.find(p => p.id === projectId)
      return proj && a.project === proj.name
    }).length,
    [attendeeRepo.all, projectRepo.all]
  )

  const addProject     = useCallback((p: Omit<Project, 'id'>) => projectRepo.add(p),                       [projectRepo])
  const updateProject  = useCallback((id: string, partial: Partial<Omit<Project, 'id'>>) => projectRepo.update(id, partial), [projectRepo])
  const archiveProject = useCallback((id: string) => projectRepo.update(id, { status: 'archived' }),        [projectRepo])
  const restoreProject = useCallback((id: string) => projectRepo.update(id, { status: 'active' }),          [projectRepo])

  const dataLoading = !!(projectRepo as any).loading || !!(attendeeRepo as any).loading

  return {
    projects: projectRepo.all, attendees: attendeeRepo.all,
    attendanceRecords: attendanceRepo.all,
    activeCount, archivedCount, memberCount,
    addProject, updateProject, archiveProject, restoreProject,
    dataLoading,
  }
}
