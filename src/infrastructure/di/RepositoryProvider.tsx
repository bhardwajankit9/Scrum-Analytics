// ─── Dependency Injection Container ──────────────────────────────────────────
// Wires concrete repository implementations to the interfaces consumed by ViewModels.
// Replaces AppContext as the single provider of app-wide state.
//
// Architecture note (Dependency Inversion Principle):
//   Presentation layer  →  IXxxRepository  ←  RepositoryProvider  →  InMemoryXxxRepository
//   ViewModels depend on interfaces; they are unaware of InMemory / Supabase / REST.

import { createContext, useContext, type ReactNode } from 'react'

import type {
  IProjectRepository,
  IAttendeeRepository,
  IAttendanceRepository,
  IHolidayRepository,
  ILeaveRepository,
  IMembershipRepository,
  IBlockerRepository,
} from '../../domain/repositories'

import { useProjectRepository }    from '../../data/repositories/SupabaseProjectRepository'
import { useAttendeeRepository }   from '../../data/repositories/SupabaseAttendeeRepository'
import { useAttendanceRepository } from '../../data/repositories/SupabaseAttendanceRepository'
import { useHolidayRepository }    from '../../data/repositories/SupabaseHolidayRepository'
import { useLeaveRepository }      from '../../data/repositories/SupabaseLeaveRepository'
import { useMembershipRepository } from '../../data/repositories/SupabaseMembershipRepository'
import { useBlockerRepository }    from '../../data/repositories/SupabaseBlockerRepository'

// ── Container interface ───────────────────────────────────────────────────────

export interface IContainer {
  projectRepo:    IProjectRepository
  attendeeRepo:   IAttendeeRepository
  attendanceRepo: IAttendanceRepository
  holidayRepo:    IHolidayRepository
  leaveRepo:      ILeaveRepository
  membershipRepo: IMembershipRepository
  blockerRepo:    IBlockerRepository
  /** true while projects or attendees are still loading from Supabase */
  dataLoading: boolean
}

// ── Context ───────────────────────────────────────────────────────────────────

const ContainerContext = createContext<IContainer | null>(null)

// ── Provider ──────────────────────────────────────────────────────────────────
// Each hook creates and owns its own reactive state.
// Swapping InMemory → Supabase = change one import per repository.

export function RepositoryProvider({ children }: { children: ReactNode }) {
  const projectRepo    = useProjectRepository()
  const attendeeRepo   = useAttendeeRepository()
  const attendanceRepo = useAttendanceRepository()
  const holidayRepo    = useHolidayRepository()
  const leaveRepo      = useLeaveRepository()
  const membershipRepo = useMembershipRepository()
  const blockerRepo    = useBlockerRepository()

  return (
    <ContainerContext.Provider
      value={{ projectRepo, attendeeRepo, attendanceRepo, holidayRepo, leaveRepo, membershipRepo, blockerRepo,
               dataLoading: projectRepo.loading === true || attendeeRepo.loading === true }}
    >
      {children}
    </ContainerContext.Provider>
  )
}

// ── Access hook ───────────────────────────────────────────────────────────────
// ViewModels call useContainer() instead of useApp().

export function useContainer(): IContainer {
  const ctx = useContext(ContainerContext)
  if (!ctx) throw new Error('useContainer must be used inside <RepositoryProvider>')
  return ctx
}
