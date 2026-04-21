// ─── Supabase Auth Repository ─────────────────────────────────────────────────
// Implements IAuthRepository using Supabase Auth + user_mpins table.
//
// Auth flows:
//   Email OTP   → supabase.auth.signInWithOtp({ email })
//               → supabase.auth.verifyOtp({ email, token, type: 'email' })
//   Google      → supabase.auth.signInWithOAuth({ provider: 'google' })  [redirect]
//   Apple       → supabase.auth.signInWithOAuth({ provider: 'apple' })   [redirect]
//   MPIN        → stored in user_mpins table (pin_hash = plain 4-digit for demo;
//                 use bcrypt in production)
//   Session     → managed by Supabase client (localStorage + auto-refresh)

import type { IAuthRepository } from '../../domain/repositories/auth'
import type { AuthUser, AuthSession, OTPRequest, UserRole } from '../../domain/entities/auth'
import { supabase } from '../../lib/supabase/client'
import type { User } from '@supabase/supabase-js'

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Map a Supabase User to our domain AuthUser (mpinSet check is async — pass it in) */
function sbUserToAuthUser(u: User, _mpinSet?: boolean): AuthUser {
  const meta  = u.user_metadata ?? {}
  const appMeta = u.app_metadata ?? {}
  return {
    id:        u.id,
    name:      (meta.full_name ?? meta.name ?? u.email?.split('@')[0] ?? 'User') as string,
    email:     u.email ?? null,
    mobile:    u.phone ?? null,
    provider:  (appMeta.provider ?? 'email') as AuthUser['provider'],
    role:      'none' as UserRole,
    avatarUrl: (meta.avatar_url ?? null) as string | null,
    createdAt: u.created_at,
  }
}

async function hasMPIN(userId: string): Promise<boolean> {
  const { data } = await supabase.from('user_mpins').select('user_id').eq('user_id', userId).maybeSingle()
  return data !== null
}

// ── Repository ────────────────────────────────────────────────────────────────

export class SupabaseAuthRepository implements IAuthRepository {
  // ── OTP ────────────────────────────────────────────────────────────────────
  async sendOTP(email: string): Promise<OTPRequest> {
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { shouldCreateUser: true },
    })
    if (error) throw new Error(error.message)
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString()
    return { email, expiresAt, attempts: 0 }
  }

  async verifyOTP(email: string, otp: string): Promise<AuthUser> {
    const { data, error } = await supabase.auth.verifyOtp({ email, token: otp, type: 'email' })
    if (error || !data.user) throw new Error(error?.message ?? 'OTP verification failed.')
    return sbUserToAuthUser(data.user)
  }

  // ── Social Login (OAuth redirect — page navigates away) ────────────────────
  async loginWithGoogle(): Promise<AuthUser> {
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/login`,
        queryParams: { access_type: 'offline', prompt: 'consent' },
      },
    })
    // Execution never reaches here in redirect mode — the browser navigates away.
    // On return, AuthProvider detects the session via onAuthStateChange.
    return null as unknown as AuthUser
  }

  async loginWithApple(): Promise<AuthUser> {
    await supabase.auth.signInWithOAuth({
      provider: 'apple',
      options: { redirectTo: `${window.location.origin}/login` },
    })
    return null as unknown as AuthUser
  }

  // ── Session ────────────────────────────────────────────────────────────────
  // NOTE: Session is managed by Supabase client and AuthProvider.
  // These methods exist to satisfy IAuthRepository; AuthProvider uses them indirectly.
  getSession(): AuthSession | null {
    // Supabase stores session in localStorage; we can read it synchronously from the
    // cached in-memory session. AuthProvider will always have the authoritative value.
    // This is only called during ViewModel initialization as a fallback.
    return null // AuthProvider initializes async via onAuthStateChange
  }

  setSession(_session: AuthSession): void {
    // Supabase manages its own session — no manual storage needed
  }

  clearSession(): void {
    // AuthProvider calls supabase.auth.signOut() directly for proper cleanup
    supabase.auth.signOut()
  }

  // ── MPIN (legacy — MPIN screen removed, kept for schema compatibility) ────
  getMPIN(userId: string): null {
    void userId
    return null
  }

  setMPIN(userId: string, pin: string): void {
    // Fire-and-forget upsert to DB
    supabase.from('user_mpins')
      .upsert({ user_id: userId, pin_hash: pin, updated_at: new Date().toISOString() })
      .then(({ error }) => { if (error) console.error('[AuthRepo] setMPIN:', error.message) })
  }

  verifyMPIN(userId: string, pin: string): boolean {
    // This is called synchronously in VerifyMPINUseCase.
    // MPIN hash is passed from the ViewModel which fetched it via the async flow.
    // We store the verified hash in localStorage as a cache to enable sync check.
    const cached = localStorage.getItem(`mpin_${userId}`)
    return cached === pin
  }

  // ── Profile ────────────────────────────────────────────────────────────────
  updateProfile(_userId: string, patch: Partial<Pick<AuthUser, 'name' | 'email'>>): AuthUser {
    const updates: Record<string, string> = {}
    if (patch.name)  updates['full_name'] = patch.name
    if (patch.email) updates['email']     = patch.email

    supabase.auth.updateUser({ data: updates })
      .then(({ error }) => { if (error) console.error('[AuthRepo] updateProfile:', error.message) })

    // Return optimistic value — AuthProvider will re-read from onAuthStateChange
    return { id: '', name: patch.name ?? '', email: patch.email ?? null, mobile: null,
             provider: 'email', role: 'none', avatarUrl: null, createdAt: '' }
  }
}

// Singleton
export const supabaseAuthRepository = new SupabaseAuthRepository()
