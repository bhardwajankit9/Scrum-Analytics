// ─── Login / OTP / MPIN Screen ────────────────────────────────────────────────
// Single-file multi-step auth flow driven entirely by useAuthViewModel.
// Views are pure — zero business logic here.

import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Mail, ArrowLeft, RotateCcw, ShieldCheck, CheckCircle2 } from 'lucide-react'
import { useAuthViewModel } from '../presentation/viewmodels/useAuthViewModel'
import { useAuth } from '../infrastructure/di/AuthProvider'

// ─── Shared sub-components ────────────────────────────────────────────────────

function ErrorBanner({ msg }: { msg: string }) {
  if (!msg) return null
  return (
    <div className="flex items-start gap-2.5 px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
      <span className="mt-0.5">⚠️</span>
      <span>{msg}</span>
    </div>
  )
}

function SuccessBanner({ msg }: { msg: string }) {
  if (!msg) return null
  return (
    <div className="flex items-start gap-2.5 px-4 py-3 bg-green-50 border border-green-200 rounded-xl text-sm text-green-700">
      <CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0" />
      <span>{msg}</span>
    </div>
  )
}

function Spinner() {
  return (
    <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
    </svg>
  )
}

// ─── OTP input: 6 individual boxes ───────────────────────────────────────────
function OTPBoxes({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const refs = useRef<(HTMLInputElement | null)[]>([])

  function handleKey(i: number, e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Backspace') {
      if (!value[i] && i > 0) { refs.current[i - 1]?.focus() }
      const next = value.split(''); next[i] = ''; onChange(next.join(''))
    }
  }

  function handleChange(i: number, v: string) {
    const digit = v.replace(/\D/g, '').slice(-1)
    const next  = value.split(''); next[i] = digit; const joined = next.join('')
    onChange(joined)
    if (digit && i < 5) refs.current[i + 1]?.focus()
  }

  function handlePaste(e: React.ClipboardEvent) {
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6)
    if (pasted) { onChange(pasted.padEnd(6, '').slice(0, 6)); refs.current[Math.min(pasted.length, 5)]?.focus() }
    e.preventDefault()
  }

  return (
    <div className="flex gap-3 justify-center" onPaste={handlePaste}>
      {Array.from({ length: 6 }, (_, i) => (
        <input
          key={i}
          ref={el => { refs.current[i] = el }}
          type="text" inputMode="numeric" maxLength={1}
          value={value[i] ?? ''}
          onChange={e => handleChange(i, e.target.value)}
          onKeyDown={e => handleKey(i, e)}
          className={`w-11 text-center text-xl font-bold border-2 rounded-xl outline-none transition-all
            focus:border-gray-900 focus:scale-105
            ${value[i] ? 'border-gray-900 bg-gray-900 text-white' : 'border-gray-200 bg-white text-gray-900'}`}
          style={{ height: '3.25rem' }}
        />
      ))}
    </div>
  )
}

// ─── Login Step ───────────────────────────────────────────────────────────────
function LoginStep({ vm }: { vm: ReturnType<typeof useAuthViewModel> }) {
  const { email, setEmail, sendOTP, socialLogin, loading, error } = vm

  return (
    <div className="space-y-5">
      <div>
        <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
          Email Address
        </label>
        <input
          type="email" inputMode="email"
          value={email} onChange={e => setEmail(e.target.value)}
          placeholder="you@company.com"
          onKeyDown={e => e.key === 'Enter' && sendOTP()}
          className="w-full h-12 px-4 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-gray-900/20 focus:border-gray-900 transition-all"
        />
      </div>

      <ErrorBanner msg={error} />

      <button
        onClick={sendOTP}
        disabled={loading || !email.includes('@')}
        className="w-full h-12 bg-gray-900 text-white rounded-xl text-sm font-semibold hover:bg-gray-800 disabled:opacity-40 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2 shadow-sm"
      >
        {loading ? <><Spinner /> Sending OTP…</> : <><Mail className="w-4 h-4" /> Send OTP to Email</>}
      </button>

      {/* Divider */}
      <div className="flex items-center gap-3">
        <div className="flex-1 h-px bg-gray-200" />
        <span className="text-xs text-gray-400 font-medium">or continue with</span>
        <div className="flex-1 h-px bg-gray-200" />
      </div>

      {/* Social buttons */}
      <div className="grid grid-cols-2 gap-3">
        <button
          onClick={() => socialLogin('google')}
          disabled={loading}
          className="flex items-center justify-center gap-2.5 h-12 border border-gray-200 rounded-xl text-sm font-semibold text-gray-700 hover:bg-gray-50 hover:border-gray-300 transition-all disabled:opacity-50 shadow-sm"
        >
          {loading ? <Spinner /> : (
            <svg viewBox="0 0 24 24" style={{ width: 18, height: 18 }}>
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
            </svg>
          )}
          Google
        </button>
        <button
          onClick={() => socialLogin('apple')}
          disabled={loading}
          className="flex items-center justify-center gap-2.5 h-12 bg-black text-white border border-black rounded-xl text-sm font-semibold hover:bg-gray-900 transition-all disabled:opacity-50 shadow-sm"
        >
          {loading ? <Spinner /> : (
            <svg viewBox="0 0 24 24" fill="white" style={{ width: 16, height: 16 }}>
              <path d="M12.152 6.896c-.948 0-2.415-1.078-3.96-1.04-2.04.027-3.91 1.183-4.961 3.014-2.117 3.675-.54 9.103 1.519 12.09 1.013 1.454 2.208 3.09 3.792 3.039 1.52-.065 2.09-.987 3.935-.987 1.831 0 2.35.987 3.96.948 1.637-.026 2.676-1.48 3.676-2.948 1.156-1.688 1.636-3.325 1.662-3.415-.039-.013-3.182-1.221-3.22-4.857-.026-3.04 2.48-4.494 2.597-4.559-1.429-2.09-3.623-2.324-4.39-2.376-2-.156-3.675 1.09-4.61 1.09zM15.53 3.83c.843-1.012 1.4-2.427 1.245-3.83-1.207.052-2.662.805-3.532 1.818-.78.896-1.454 2.338-1.273 3.714 1.338.104 2.715-.688 3.559-1.701z" />
            </svg>
          )}
          Apple
        </button>
      </div>
    </div>
  )
}

// ─── OTP Step ─────────────────────────────────────────────────────────────────
function OTPStep({ vm }: { vm: ReturnType<typeof useAuthViewModel> }) {
  const { email, otp, setOtp, verifyOTP, resendOTP, goBack, loading, error, success, otpExpiry } = vm
  const [countdown, setCountdown] = useState(300)

  useEffect(() => {
    setCountdown(300)
    const id = setInterval(() => setCountdown(c => Math.max(0, c - 1)), 1000)
    return () => clearInterval(id)
  }, [otpExpiry])

  const mm = String(Math.floor(countdown / 60)).padStart(2, '0')
  const ss = String(countdown % 60).padStart(2, '0')

  return (
    <div className="space-y-6">
      <div className="text-center">
        <div className="inline-flex items-center justify-center w-14 h-14 bg-blue-50 rounded-2xl mb-3">
          <Mail className="w-7 h-7 text-blue-600" />
        </div>
        <p className="text-sm text-gray-500">
          We sent a 6-digit code to<br />
          <span className="font-semibold text-gray-900">{email}</span>
        </p>
        <p className="text-xs text-gray-400 mt-1">Check your inbox (and spam folder)</p>
      </div>

      <OTPBoxes value={otp} onChange={setOtp} />

      <ErrorBanner msg={error} />
      <SuccessBanner msg={success} />

      <button
        onClick={verifyOTP}
        disabled={loading || otp.length < 6}
        className="w-full h-12 bg-gray-900 text-white rounded-xl text-sm font-semibold hover:bg-gray-800 disabled:opacity-40 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
      >
        {loading ? <><Spinner /> Verifying…</> : 'Verify OTP'}
      </button>

      <div className="flex items-center justify-between text-sm">
        <button onClick={goBack} className="flex items-center gap-1 text-gray-400 hover:text-gray-700 transition-colors">
          <ArrowLeft className="w-3.5 h-3.5" /> Change email
        </button>
        {countdown > 0 ? (
          <span className="text-gray-400 text-xs">Resend in {mm}:{ss}</span>
        ) : (
          <button onClick={resendOTP} disabled={loading} className="flex items-center gap-1 text-gray-700 font-medium hover:text-gray-900 transition-colors">
            <RotateCcw className="w-3.5 h-3.5" /> Resend OTP
          </button>
        )}
      </div>
    </div>
  )
}



// ─── Root screen ──────────────────────────────────────────────────────────────
const STEP_TITLES: Record<string, string> = {
  login: 'Sign In',
  otp:   'Verify OTP',
}

export default function LoginScreen() {
  const navigate = useNavigate()
  const { session } = useAuth()
  const vm = useAuthViewModel()

  // Only navigate when AuthProvider.session is confirmed — NOT on vm.isAuthenticated.
  // vm.isAuthenticated (step === 'authenticated') fires as soon as OTP is verified, but
  // AuthProvider.session is set ~1-2 s later after buildAuthUser completes.
  // Navigating too early causes RequireAuth to bounce the user back to /login.
  useEffect(() => {
    if (session) {
      navigate('/', { replace: true })
    }
  }, [session])

  const showBack = vm.step === 'otp'

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-100 flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-sm">

        {/* Brand header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 bg-gray-900 rounded-2xl mb-4 shadow-lg">
            <ShieldCheck className="w-7 h-7 text-white" />
          </div>
          <h1 className="text-2xl font-extrabold text-gray-900 tracking-tight">Scrum Analytics</h1>
          <p className="text-sm text-gray-400 mt-1">Discipline &amp; Participation Platform</p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-3xl shadow-xl border border-gray-100 overflow-hidden">

          {/* Step header */}
          <div className="px-7 pt-7 pb-5 border-b border-gray-100">
            <div className="flex items-center gap-3">
              {showBack && (
                <button onClick={vm.goBack}
                  className="w-8 h-8 flex items-center justify-center rounded-xl hover:bg-gray-100 transition-colors">
                  <ArrowLeft className="w-4 h-4 text-gray-500" />
                </button>
              )}
              <div>
                <h2 className="text-base font-bold text-gray-900">{STEP_TITLES[vm.step] ?? 'Sign In'}</h2>
                {/* Progress dots */}
                <div className="flex gap-1.5 mt-1.5">
                  {(['login','otp'] as const).map((s, i) => {
                    const steps = ['login','otp','authenticated']
                    const currentIdx = steps.indexOf(vm.step)
                    const thisIdx = steps.indexOf(s)
                    return (
                      <div key={i} className={`h-1 rounded-full transition-all duration-300
                        ${vm.step === s ? 'w-6 bg-gray-900' : thisIdx < currentIdx ? 'w-3 bg-gray-500' : 'w-3 bg-gray-200'}`} />
                    )
                  })}
                </div>
              </div>
            </div>
          </div>

          {/* Step body */}
          <div className="px-7 py-6">
            {vm.step === 'authenticated' ? (
              // OTP accepted — wait for AuthProvider to confirm the session.
              // This avoids a flicker back to the login form during the async gap.
              <div className="flex flex-col items-center gap-3 py-8">
                <Spinner />
                <p className="text-sm text-gray-500">Signing you in…</p>
              </div>
            ) : (
              <>
                {vm.step === 'login' && <LoginStep vm={vm} />}
                {vm.step === 'otp'   && <OTPStep   vm={vm} />}
              </>
            )}
          </div>
        </div>

        <p className="text-center text-xs text-gray-400 mt-6">
          © 2026 Scrum Analytics · Secure · Encrypted
        </p>
      </div>
    </div>
  )
}


