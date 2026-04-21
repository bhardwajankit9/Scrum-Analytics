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
  const [step,      setStep]     = useState<AuthStep>(() => session ? 'authenticated' : 'login')
  const [email,     setEmail]    = useState('')
  const [otp,       setOtp]      = useState('')
  const [otpExpiry, setOtpExpiry]= useState('')
  const [loading,   setLoading]  = useState(false)
  const [error,     setError]    = useState('')
  const [success,   setSuccess]  = useState('')

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
    // redirect=true means OAuth flow was started — browser is navigating away.
    // Keep the loading spinner; do NOT show an error.
    if (result.redirect) return
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
