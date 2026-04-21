// ─── Auth Domain Entities ─────────────────────────────────────────────────────

export type AuthProvider = 'email' | 'google' | 'apple'
export type AuthStep     = 'login' | 'otp' | 'authenticated'
export type UserRole     = 'owner_pmo' | 'pmo' | 'viewer' | 'none'

export const ROLE_LABELS: Record<UserRole, string> = {
  owner_pmo: 'Owner PMO',
  pmo:       'PMO',
  viewer:    'Viewer',
  none:      'No Access',
}

export const ROLE_RANK: Record<UserRole, number> = {
  owner_pmo: 3,
  pmo:       2,
  viewer:    1,
  none:      0,
}

export interface AuthUser {
  id:          string
  name:        string
  email:       string | null
  mobile:      string | null
  provider:    AuthProvider
  avatarUrl:   string | null
  role:        UserRole
  createdAt:   string
}

export interface OTPRequest {
  email:     string
  expiresAt: string
  attempts:  number
}

export interface AuthSession {
  user:        AuthUser
  accessToken: string
  expiresAt:   string
}
