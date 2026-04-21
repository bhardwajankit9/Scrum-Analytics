// ─── Auth Repository Interface ────────────────────────────────────────────────
// All auth use-cases depend on this abstraction.
// Swap InMemory → Supabase / Firebase without touching any ViewModel.

import type { AuthUser, AuthSession, OTPRequest, AuthProvider } from '../entities/auth'

export interface IAuthRepository {
  // OTP
  sendOTP(email: string): Promise<OTPRequest>
  verifyOTP(email: string, otp: string): Promise<AuthUser>

  // Social
  loginWithGoogle(): Promise<AuthUser>
  loginWithApple(): Promise<AuthUser>

  // Session
  getSession(): AuthSession | null
  setSession(session: AuthSession): void
  clearSession(): void

  // Profile
  updateProfile(userId: string, patch: Partial<Pick<AuthUser, 'name' | 'email'>>): AuthUser
}
