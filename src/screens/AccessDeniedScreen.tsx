// ─── Access Denied Screen ─────────────────────────────────────────────────────
import { useEffect } from 'react'
import { ShieldOff } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../infrastructure/di/AuthProvider'
import { ROLE_LABELS } from '../domain/entities/auth'

export default function AccessDeniedScreen() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  // If the user somehow lands here but actually has a valid role
  // (e.g. after an auth state refresh), redirect them to the dashboard.
  useEffect(() => {
    if (user && user.role !== 'none') {
      navigate('/', { replace: true })
    }
  }, [user, navigate])

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="bg-white rounded-3xl shadow-xl border border-gray-100 w-full max-w-sm p-8 text-center space-y-5">
        <div className="inline-flex items-center justify-center w-16 h-16 bg-red-100 rounded-2xl">
          <ShieldOff className="w-8 h-8 text-red-500" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-gray-900">Access Denied</h1>
          <p className="text-sm text-gray-500 mt-1">
            Your account doesn't have permission to access this application.
          </p>
        </div>
        {user && (
          <div className="bg-gray-50 rounded-xl p-3 text-left space-y-1">
            <p className="text-xs text-gray-500">Logged in as</p>
            <p className="text-sm font-semibold text-gray-900">{user.name}</p>
            <p className="text-xs text-gray-400">{user.email}</p>
            <span className="inline-block mt-1 px-2 py-0.5 bg-red-100 text-red-600 text-xs font-semibold rounded-full">
              Role: {ROLE_LABELS[user.role]}
            </span>
          </div>
        )}
        <p className="text-xs text-gray-400">
          Contact your Owner PMO to request access.
        </p>
        <div className="flex gap-2">
          <button
            onClick={() => navigate(-1)}
            className="flex-1 h-10 rounded-xl border border-gray-200 text-sm font-semibold text-gray-600 hover:bg-gray-50 transition-colors"
          >
            Go Back
          </button>
          <button
            onClick={() => logout().then(() => navigate('/login', { replace: true }))}
            className="flex-1 h-10 rounded-xl bg-gray-900 text-white text-sm font-semibold hover:bg-gray-800 transition-colors"
          >
            Sign Out
          </button>
        </div>
      </div>
    </div>
  )
}
