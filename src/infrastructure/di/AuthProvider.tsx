// ─── Auth Context / DI ────────────────────────────────────────────────────────
// Session is persistent — survives page refresh and browser restart.
// Strategy:
//   1. On INITIAL_SESSION: restore AuthUser from localStorage cache instantly
//      (no login flash, no waiting for DB).
//   2. Kick off async role-fetch from project_memberships in the background
//      and update the session once it resolves.
//   3. Only clear session on explicit logout or when Supabase itself has no session.
//   4. Never log out due to a DB/network error.

import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from 'react'
import { supabase } from '../../lib/supabase/client'
import { supabaseAuthRepository } from '../../data/repositories/SupabaseAuthRepository'
import type { IAuthRepository } from '../../domain/repositories/auth'
import type { AuthSession, AuthUser, UserRole } from '../../domain/entities/auth'
import { ROLE_RANK as RANK } from '../../domain/entities/auth'
import type { User } from '@supabase/supabase-js'

// ── Cache helpers ─────────────────────────────────────────────────────────────

const USER_CACHE_KEY = 'auth_user_cache'

function cacheUser(user: AuthUser) {
  try { localStorage.setItem(USER_CACHE_KEY, JSON.stringify(user)) } catch { /* ignore */ }
}

function getCachedUser(): AuthUser | null {
  try {
    const raw = localStorage.getItem(USER_CACHE_KEY)
    return raw ? (JSON.parse(raw) as AuthUser) : null
  } catch { return null }
}

function clearUserCache() {
  try { localStorage.removeItem(USER_CACHE_KEY) } catch { /* ignore */ }
}

// ── Role resolution ───────────────────────────────────────────────────────────

const ADMIN_EMAILS = (import.meta.env.VITE_ADMIN_EMAIL as string ?? '')
  .split(',').map((e: string) => e.trim().toLowerCase()).filter(Boolean)

async function resolveRole(email: string | null | undefined): Promise<UserRole> {
  if (!email) return 'none'
  if (ADMIN_EMAILS.includes(email.toLowerCase())) return 'owner_pmo'

  try {
    const { data: memberships, error } = await supabase
      .from('project_memberships')
      .select('role')
      .eq('user_email', email)

    if (error) {
      console.warn('[AuthProvider] role fetch error:', error.message)
      return 'none'
    }
    if (memberships && memberships.length > 0) {
      return memberships.reduce((best, m) => {
        const r = m.role as UserRole
        return RANK[r] > RANK[best] ? r : best
      }, 'none' as UserRole)
    }
  } catch (e) {
    console.warn('[AuthProvider] role fetch threw:', e)
  }
  return 'none'
}

// ── Build AuthUser (called once, then cached) ─────────────────────────────────

async function buildAuthUser(sbUser: User): Promise<AuthUser> {
  const meta    = sbUser.user_metadata ?? {}
  const appMeta = sbUser.app_metadata  ?? {}
  const provider = (appMeta.provider ?? 'email') as AuthUser['provider']
  const role    = await resolveRole(sbUser.email)

  const authUser: AuthUser = {
    id:        sbUser.id,
    name:      (meta.full_name ?? meta.name ?? sbUser.email?.split('@')[0] ?? 'User') as string,
    email:     sbUser.email ?? null,
    mobile:    sbUser.phone ?? null,
    provider,
    avatarUrl: (meta.avatar_url ?? null) as string | null,
    role,
    createdAt: sbUser.created_at,
  }

  cacheUser(authUser)

  // Fire-and-forget profile upsert
  supabase.from('user_profiles').upsert({
    id: sbUser.id, name: authUser.name, email: authUser.email,
    avatar_url: authUser.avatarUrl, provider, role,
    last_login: new Date().toISOString(), updated_at: new Date().toISOString(),
  }, { onConflict: 'id' })
  .then(({ error }) => {
    if (error) console.warn('[AuthProvider] profile upsert:', error.message)
  })

  return authUser
}

function makeSession(
  sbSession: { access_token: string; expires_at?: number },
  user: AuthUser
): AuthSession {
  return {
    user,
    accessToken: sbSession.access_token,
    expiresAt: sbSession.expires_at
      ? new Date(sbSession.expires_at * 1000).toISOString()
      : new Date(Date.now() + 3600_000).toISOString(),
  }
}

// ── Context ───────────────────────────────────────────────────────────────────

interface IAuthContext {
  repo:         IAuthRepository
  session:      AuthSession | null
  user:         AuthUser | null
  initializing: boolean
  setSession:   (s: AuthSession | null) => void
  logout:       () => Promise<void>
}

const AuthContext = createContext<IAuthContext | null>(null)

// ── Provider ──────────────────────────────────────────────────────────────────

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session,      setSessionState] = useState<AuthSession | null>(null)
  const [initializing, setInitializing] = useState(true)

  useEffect(() => {
    // Hard timeout — never hang on the loading screen
    const timeout = setTimeout(() => setInitializing(false), 6000)

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, sbSession) => {
      if (!sbSession) {
        // No Supabase session → clear everything
        clearUserCache()
        setSessionState(null)
        if (event === 'INITIAL_SESSION') {
          clearTimeout(timeout)
          setInitializing(false)
        }
        return
      }

      // ── We have a valid Supabase session ──────────────────────────────────

      if (event === 'INITIAL_SESSION') {
        const cached = getCachedUser()
        // Use cache only when the role is properly resolved (not stale 'none').
        // A cached role of 'none' means a previous failed/missing DB fetch — skip
        // it so we always resolve to the correct role before the app renders.
        if (cached && cached.id === sbSession.user.id && cached.role !== 'none') {
          // Instantly show the app with the cached user (no login flash).
          setSessionState(makeSession(sbSession, cached))
          clearTimeout(timeout)
          setInitializing(false)
          // Silently refresh role in background — DOES NOT block rendering.
          // RequireRole already has the cached valid role so nothing is blocked.
          buildAuthUser(sbSession.user).then(freshUser => {
            setSessionState(prev => prev ? makeSession(sbSession, freshUser) : null)
          }).catch(() => { /* keep cached session on error */ })
          return
        }

        // No valid cache — must fetch before showing the app (avoids role='none' flash).
        try {
          const user = await buildAuthUser(sbSession.user)
          setSessionState(makeSession(sbSession, user))
        } catch {
          const fallback: AuthUser = {
            id:        sbSession.user.id,
            name:      sbSession.user.user_metadata?.full_name ?? sbSession.user.email?.split('@')[0] ?? 'User',
            email:     sbSession.user.email ?? null,
            mobile:    null,
            provider:  'email',
            avatarUrl: null,
            role:      ADMIN_EMAILS.includes((sbSession.user.email ?? '').toLowerCase()) ? 'owner_pmo' : 'none',
            createdAt: sbSession.user.created_at,
          }
          setSessionState(makeSession(sbSession, fallback))
        } finally {
          clearTimeout(timeout)
          setInitializing(false)
        }
        return
      }

      // SIGNED_IN (OTP verify, OAuth redirect, token refresh)
      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
        try {
          const user = await buildAuthUser(sbSession.user)
          setSessionState(makeSession(sbSession, user))
        } catch {
          const existing = getCachedUser()
          const fallback: AuthUser = existing ?? {
            id:        sbSession.user.id,
            name:      sbSession.user.user_metadata?.full_name ?? sbSession.user.email?.split('@')[0] ?? 'User',
            email:     sbSession.user.email ?? null,
            mobile:    null,
            provider:  'email',
            avatarUrl: null,
            role:      ADMIN_EMAILS.includes((sbSession.user.email ?? '').toLowerCase()) ? 'owner_pmo' : 'none',
            createdAt: sbSession.user.created_at,
          }
          setSessionState(makeSession(sbSession, fallback))
        } finally {
          clearTimeout(timeout)
          setInitializing(false)
        }
      }
    })

    return () => { subscription.unsubscribe(); clearTimeout(timeout) }
  }, [])

  const setSession = useCallback((s: AuthSession | null) => setSessionState(s), [])

  const logout = useCallback(async () => {
    clearUserCache()
    await supabase.auth.signOut()
    setSessionState(null)
  }, [])

  if (initializing) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="flex flex-col items-center gap-3 text-gray-500">
          <svg className="animate-spin w-8 h-8" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
          </svg>
          <span className="text-sm font-medium">Loading…</span>
        </div>
      </div>
    )
  }

  return (
    <AuthContext.Provider value={{
      repo: supabaseAuthRepository,
      session, user: session?.user ?? null,
      initializing, setSession, logout,
    }}>
      {children}
    </AuthContext.Provider>
  )
}

// ── Hook ──────────────────────────────────────────────────────────────────────

export function useAuth(): IAuthContext {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be inside <AuthProvider>')
  return ctx
}
