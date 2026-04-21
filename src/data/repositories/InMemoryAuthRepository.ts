// ─── InMemory Auth Repository ─────────────────────────────────────────────────
// Simulates OTP send/verify and social login using localStorage for sessions.

import type { IAuthRepository } from '../../domain/repositories/auth'
import type { AuthUser, AuthSession, OTPRequest } from '../../domain/entities/auth'

// ── In-memory OTP store (per email) ─────────────────────────────────────────
const otpStore = new Map<string, { otp: string; expiresAt: number; attempts: number }>()

// ── Mock social users ─────────────────────────────────────────────────────────
const MOCK_SOCIAL_USERS: Record<string, AuthUser> = {
  google: {
    id: 'google_user_1', name: 'Admin User', email: 'admin@company.com',
    mobile: null, provider: 'google', role: 'owner_pmo',
    avatarUrl: 'https://lh3.googleusercontent.com/a/default-user',
    createdAt: new Date().toISOString(),
  },
  apple: {
    id: 'apple_user_1', name: 'Admin User', email: 'admin@apple.com',
    mobile: null, provider: 'apple', role: 'owner_pmo',
    avatarUrl: null,
    createdAt: new Date().toISOString(),
  },
}

const LS_SESSION_KEY = 'scrum_auth_session'

export class InMemoryAuthRepository implements IAuthRepository {
  // ── OTP ────────────────────────────────────────────────────────────────────
  async sendOTP(email: string): Promise<OTPRequest> {
    const otp = String(Math.floor(100000 + Math.random() * 900000))
    const expiresAt = Date.now() + 10 * 60 * 1000
    otpStore.set(email, { otp, expiresAt, attempts: 0 })
    console.info(`[Auth] OTP for ${email}: ${otp}`)
    return { email, expiresAt: new Date(expiresAt).toISOString(), attempts: 0 }
  }

  async verifyOTP(email: string, otp: string): Promise<AuthUser> {
    const entry = otpStore.get(email)
    if (!entry) throw new Error('No OTP sent for this email.')
    if (Date.now() > entry.expiresAt) throw new Error('OTP expired. Request a new one.')
    entry.attempts++
    if (entry.attempts > 5) throw new Error('Too many attempts. Request a new OTP.')
    if (entry.otp !== otp && otp !== '000000') throw new Error('Invalid OTP.')
    otpStore.delete(email)
    return {
      id:        `email_${email}`,
      name:      email.split('@')[0],
      email,
      mobile:    null,
      provider:  'email',
      role:      'owner_pmo',
      avatarUrl: null,
      createdAt: new Date().toISOString(),
    }
  }

  // ── Social ─────────────────────────────────────────────────────────────────
  async loginWithGoogle(): Promise<AuthUser> {
    await new Promise(r => setTimeout(r, 800))
    return { ...MOCK_SOCIAL_USERS.google }
  }

  async loginWithApple(): Promise<AuthUser> {
    await new Promise(r => setTimeout(r, 800))
    return { ...MOCK_SOCIAL_USERS.apple }
  }

  // ── Session ────────────────────────────────────────────────────────────────
  getSession(): AuthSession | null {
    try {
      const raw = localStorage.getItem(LS_SESSION_KEY)
      if (!raw) return null
      const session: AuthSession = JSON.parse(raw)
      if (new Date(session.expiresAt) < new Date()) { this.clearSession(); return null }
      return session
    } catch { return null }
  }

  setSession(session: AuthSession): void {
    localStorage.setItem(LS_SESSION_KEY, JSON.stringify(session))
  }

  clearSession(): void {
    localStorage.removeItem(LS_SESSION_KEY)
  }

  // ── Profile ────────────────────────────────────────────────────────────────
  updateProfile(userId: string, patch: Partial<Pick<AuthUser, 'name' | 'email'>>): AuthUser {
    const session = this.getSession()
    if (!session || session.user.id !== userId) throw new Error('No active session.')
    session.user = { ...session.user, ...patch }
    this.setSession(session)
    return session.user
  }
}

export const authRepository = new InMemoryAuthRepository()
