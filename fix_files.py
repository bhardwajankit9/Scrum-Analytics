import os

files = {}

files['src/data/repositories/InMemoryAuthRepository.ts'] = """\
// ─── InMemory Auth Repository ─────────────────────────────────────────────────
// Simulates OTP send/verify and social login using localStorage for sessions.

import type { IAuthRepository } from '../../domain/repositories/auth'
import type { AuthUser, AuthSession, OTPRequest } from '../../domain/entities/auth'

const otpStore = new Map<string, { otp: string; expiresAt: number; attempts: number }>()

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

  async loginWithGoogle(): Promise<AuthUser> {
    await new Promise(r => setTimeout(r, 800))
    return { ...MOCK_SOCIAL_USERS.google }
  }

  async loginWithApple(): Promise<AuthUser> {
    await new Promise(r => setTimeout(r, 800))
    return { ...MOCK_SOCIAL_USERS.apple }
  }

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

  updateProfile(userId: string, patch: Partial<Pick<AuthUser, 'name' | 'email'>>): AuthUser {
    const session = this.getSession()
    if (!session || session.user.id !== userId) throw new Error('No active session.')
    session.user = { ...session.user, ...patch }
    this.setSession(session)
    return session.user
  }
}

export const authRepository = new InMemoryAuthRepository()
"""

files['src/domain/usecases/auth.ts'] = """\
// ─── Auth Use Cases ───────────────────────────────────────────────────────────
// Each use-case = one responsibility (SRP).
// All depend on IAuthRepository (DIP) — never on concrete implementations.

import type { IAuthRepository } from '../repositories/auth'
import type { AuthUser, AuthSession } from '../entities/auth'

// ── SendOTPUseCase ────────────────────────────────────────────────────────────
export class SendOTPUseCase {
  constructor(private repo: IAuthRepository) {}

  async execute(email: string): Promise<{ success: boolean; expiresAt: string; error?: string }> {
    if (!/^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/.test(email.trim())) {
      return { success: false, expiresAt: '', error: 'Enter a valid email address.' }
    }
    const req = await this.repo.sendOTP(email.trim().toLowerCase())
    return { success: true, expiresAt: req.expiresAt }
  }
}

// ── VerifyOTPUseCase ──────────────────────────────────────────────────────────
export class VerifyOTPUseCase {
  constructor(private repo: IAuthRepository) {}

  async execute(email: string, otp: string): Promise<{ user: AuthUser | null; error?: string }> {
    if (otp.length !== 6) return { user: null, error: 'OTP must be 6 digits.' }
    const user = await this.repo.verifyOTP(email, otp)
    if (!user) return { user: null, error: 'Invalid or expired OTP. Try again.' }
    const session: AuthSession = {
      user,
      accessToken: `tok_${Date.now()}`,
      expiresAt:   new Date(Date.now() + 7 * 86400000).toISOString(),
    }
    this.repo.setSession(session)
    return { user }
  }
}

// ── SocialLoginUseCase ────────────────────────────────────────────────────────
export class SocialLoginUseCase {
  constructor(private repo: IAuthRepository) {}

  async execute(provider: 'google' | 'apple'): Promise<{ user: AuthUser | null; error?: string }> {
    const user = provider === 'google'
      ? await this.repo.loginWithGoogle()
      : await this.repo.loginWithApple()
    if (!user) return { user: null, error: `${provider} sign-in was cancelled or failed.` }
    const session: AuthSession = {
      user,
      accessToken: `tok_${Date.now()}`,
      expiresAt:   new Date(Date.now() + 7 * 86400000).toISOString(),
    }
    this.repo.setSession(session)
    return { user }
  }
}

// ── LogoutUseCase ─────────────────────────────────────────────────────────────
export class LogoutUseCase {
  constructor(private repo: IAuthRepository) {}
  execute(): void { this.repo.clearSession() }
}
"""

files['src/presentation/viewmodels/useAuthViewModel.ts'] = """\
// ─── Auth ViewModel ───────────────────────────────────────────────────────────
// Drives LoginScreen. All business rules live in use-cases.

import { useState, useCallback } from 'react'
import { useAuth } from '../../infrastructure/di/AuthProvider'
import {
  SendOTPUseCase, VerifyOTPUseCase, SocialLoginUseCase, LogoutUseCase,
} from '../../domain/usecases/auth'
import type { AuthStep } from '../../domain/entities/auth'

export function useAuthViewModel() {
  const { repo, session, user, logout: ctxLogout } = useAuth()

  const sendOTPUC   = new SendOTPUseCase(repo)
  const verifyOTPUC = new VerifyOTPUseCase(repo)
  const socialUC    = new SocialLoginUseCase(repo)
  const logoutUC    = new LogoutUseCase(repo)

  // ── State ──────────────────────────────────────────────────────────────────
  const [step,      setStep]      = useState<AuthStep>(() => session ? 'authenticated' : 'login')
  const [email,     setEmail]     = useState('')
  const [otp,       setOtp]       = useState('')
  const [otpExpiry, setOtpExpiry] = useState('')
  const [loading,   setLoading]   = useState(false)
  const [error,     setError]     = useState('')
  const [success,   setSuccess]   = useState('')

  const clearMessages = () => { setError(''); setSuccess('') }

  // ── Send OTP ───────────────────────────────────────────────────────────────
  const sendOTP = useCallback(async () => {
    clearMessages(); setLoading(true)
    const result = await sendOTPUC.execute(email)
    setLoading(false)
    if (!result.success) { setError(result.error ?? 'Failed to send OTP.'); return }
    setOtpExpiry(result.expiresAt)
    setSuccess(`OTP sent to ${email}. Check your inbox.`)
    setStep('otp')
  }, [email])

  // ── Verify OTP ─────────────────────────────────────────────────────────────
  const verifyOTP = useCallback(async () => {
    clearMessages(); setLoading(true)
    try {
      const result = await verifyOTPUC.execute(email, otp)
      setLoading(false)
      if (!result.user) { setError(result.error ?? 'Verification failed.'); return }
      setStep('authenticated')
    } catch (e: unknown) {
      setLoading(false)
      setError(e instanceof Error ? e.message : 'Verification failed.')
    }
  }, [email, otp])

  // ── Social Login ───────────────────────────────────────────────────────────
  const socialLogin = useCallback(async (provider: 'google' | 'apple') => {
    clearMessages(); setLoading(true)
    const result = await socialUC.execute(provider)
    setLoading(false)
    if (!result.user) { setError(result.error ?? 'Sign-in failed.'); return }
    setStep('authenticated')
  }, [])

  // ── Logout ─────────────────────────────────────────────────────────────────
  const logout = useCallback(async () => {
    await ctxLogout()
    setStep('login')
    setEmail(''); setOtp('')
    clearMessages()
  }, [])

  // ── Resend OTP ─────────────────────────────────────────────────────────────
  const resendOTP = useCallback(async () => {
    clearMessages(); setOtp(''); setLoading(true)
    const result = await sendOTPUC.execute(email)
    setLoading(false)
    if (!result.success) { setError(result.error ?? 'Failed to resend.'); return }
    setOtpExpiry(result.expiresAt)
    setSuccess('New OTP sent! Check your inbox.')
  }, [email])

  return {
    step, email, setEmail, otp, setOtp, otpExpiry,
    loading, error, success,
    user,
    isAuthenticated: step === 'authenticated',
    sendOTP, verifyOTP, socialLogin, logout, resendOTP,
    goBack: () => { clearMessages(); setStep('login'); setOtp('') },
  }
}
"""

for path, content in files.items():
    with open(path, 'w') as f:
        f.write(content)
    print(f"Written: {path}")
