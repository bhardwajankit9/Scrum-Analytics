// ─── Auth Use Cases ───────────────────────────────────────────────────────────
// Each use-case = one responsibility (SRP).
// All depend on IAuthRepository (DIP) — never on concrete implementations.

import type { IAuthRepository } from '../repositories/auth'
import type { AuthUser, AuthSession } from '../entities/auth'

// ── SendOTPUseCase ────────────────────────────────────────────────────────────
export class SendOTPUseCase {
  constructor(private repo: IAuthRepository) {}

  async execute(email: string): Promise<{ success: boolean; expiresAt: string; error?: string }> {
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
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

  async execute(provider: 'google' | 'apple'): Promise<{ user: AuthUser | null; redirect?: boolean; error?: string }> {
    const user = provider === 'google'
      ? await this.repo.loginWithGoogle()
      : await this.repo.loginWithApple()
    // OAuth redirect mode: loginWithGoogle/Apple sets window.location and returns null.
    // null here means "redirect was initiated successfully" — NOT a failure.
    if (!user) return { user: null, redirect: true }
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
