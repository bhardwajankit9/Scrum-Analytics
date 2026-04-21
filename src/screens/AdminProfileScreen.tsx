import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ArrowLeft, Camera, Bell, Lock, Activity, Save, Eye, EyeOff,
  CheckCircle, Mail, Smartphone, MessageSquare, Clock, AlertTriangle,
  Calendar, ChevronRight, ShieldCheck, ShieldAlert, Eye as EyeIcon,
} from 'lucide-react'
import { useAdminProfileViewModel } from '../presentation/viewmodels/useAdminProfileViewModel'
import { ROLE_LABELS, type UserRole } from '../domain/entities/auth'

// ─── Toggle ───────────────────────────────────────────────────────────────────

function Toggle({ checked, onChange }: { checked: boolean; onChange: () => void }) {
  return (
    <button
      onClick={onChange}
      className={`relative shrink-0 rounded-full transition-colors duration-200 ${checked ? 'bg-gray-900' : 'bg-gray-200'}`}
      style={{ width: 40, height: 22 }}
    >
      <span
        className="absolute top-0.5 bg-white rounded-full shadow transition-all duration-200"
        style={{ width: 18, height: 18, top: 2, left: checked ? 20 : 2 }}
      />
    </button>
  )
}

// ─── Section card ─────────────────────────────────────────────────────────────

function Card({ title, children, action }: { title: string; children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm">
      <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
        <h2 className="font-semibold text-gray-900">{title}</h2>
        {action}
      </div>
      <div className="p-6">{children}</div>
    </div>
  )
}

// ─── Admin Profile ────────────────────────────────────────────────────────────

const AVATAR_COLORS = ['bg-violet-600', 'bg-blue-600', 'bg-emerald-600', 'bg-rose-600', 'bg-amber-600']

export default function AdminProfileScreen() {
  const navigate = useNavigate()
  const { activityLog, stats, user } = useAdminProfileViewModel()
  const userRole: UserRole = user?.role ?? 'none'
  const canEdit = userRole === 'owner_pmo' || userRole === 'pmo'

  // ── Profile state (seeded from logged-in user) ───────────────────────────
  const [profile, setProfile] = useState(() => ({
    name:        user?.name        ?? 'Admin User',
    email:       user?.email       ?? '',
    orgCode:     'ORG-9F2K',
    role:        ROLE_LABELS[user?.role ?? 'none'],
    department:  'Engineering',
    phone:       user?.mobile      ?? '',
    timezone:    'Asia/Kolkata',
    avatarColor: 0,
    provider:    user?.provider    ?? 'email',
    avatarUrl:   user?.avatarUrl   ?? null,
  }))
  const [profileSaved, setProfileSaved] = useState(false)

  const initials = profile.name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()

  function saveProfile() {
    setProfileSaved(true)
    setTimeout(() => setProfileSaved(false), 3000)
  }

  // ── Notification prefs ────────────────────────────────────────────────────
  const [notif, setNotif] = useState({
    dailyReminder:    true,
    lateAlert:        true,
    absentAlert:      true,
    weeklySummary:    true,
    holidayAlert:     true,
    leaveApproval:    true,
    systemUpdates:    false,
    // channels
    emailEnabled:     true,
    slackEnabled:     false,
    smsEnabled:       false,
    inAppEnabled:     true,
    // timing
    reminderTime:     '09:45',
    digestFrequency:  'daily' as 'daily' | 'weekly',
    // thresholds
    lateThreshold:    5,
    absentThreshold:  2,
  })
  const [notifSaved, setNotifSaved] = useState(false)

  function saveNotif() {
    setNotifSaved(true)
    setTimeout(() => setNotifSaved(false), 3000)
  }

  // ── Password ──────────────────────────────────────────────────────────────
  const [pwd, setPwd] = useState({ current: '', next: '', confirm: '' })
  const [showPwd, setShowPwd] = useState({ current: false, next: false, confirm: false })
  const [pwdError, setPwdError] = useState('')
  const [pwdSaved, setPwdSaved] = useState(false)
  const pwdStrong = pwd.next.length >= 8 && /[A-Z]/.test(pwd.next) && /\d/.test(pwd.next)

  function savePwd() {
    if (!pwd.current) { setPwdError('Enter current password.'); return }
    if (!pwdStrong)   { setPwdError('Password must be 8+ chars, include a capital letter and a number.'); return }
    if (pwd.next !== pwd.confirm) { setPwdError('Passwords do not match.'); return }
    setPwdError('')
    setPwdSaved(true)
    setPwd({ current: '', next: '', confirm: '' })
    setTimeout(() => setPwdSaved(false), 3000)
  }


  // ── Quick stats ───────────────────────────────────────────────────────────
  const tabs = ['Profile', 'Notifications', 'Security', 'Activity'] as const
  type Tab = typeof tabs[number]
  const [activeTab, setActiveTab] = useState<Tab>('Profile')

  return (
    <div className="p-6 min-h-full">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <button onClick={() => navigate(-1)}
          className="w-9 h-9 flex items-center justify-center rounded-xl border border-gray-200 bg-white hover:bg-gray-50 transition-colors">
          <ArrowLeft className="w-4 h-4 text-gray-500" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">My Profile</h1>
          <p className="text-sm text-gray-400 mt-0.5">Manage your account and notification preferences</p>
        </div>
      </div>

      <div className="flex gap-6">
        {/* Left panel */}
        <div className="w-64 shrink-0 space-y-4">
          {/* Avatar card */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 flex flex-col items-center text-center">
            <div className="relative mb-4">
              {profile.avatarUrl ? (
                <img src={profile.avatarUrl} alt={profile.name}
                  className="w-20 h-20 rounded-full object-cover shadow-sm" />
              ) : (
                <div className={`w-20 h-20 rounded-full ${AVATAR_COLORS[profile.avatarColor]} flex items-center justify-center text-2xl font-bold text-white shadow-sm`}>
                  {initials}
                </div>
              )}
              <button className="absolute -bottom-1 -right-1 w-7 h-7 bg-gray-900 rounded-full flex items-center justify-center shadow">
                <Camera className="w-3.5 h-3.5 text-white" />
              </button>
            </div>
            <p className="font-semibold text-gray-900">{profile.name}</p>
            <p className="text-xs text-gray-400 mt-0.5">{profile.email}</p>
            <span className="mt-2 px-3 py-1 bg-gray-900 text-white text-[11px] font-semibold rounded-full">{profile.role}</span>
            {profile.provider !== 'email' && (
              <span className="mt-1 px-2 py-0.5 bg-blue-50 text-blue-700 text-[11px] font-semibold rounded-full capitalize">
                via {profile.provider}
              </span>
            )}

            {/* Color picker */}
            <div className="flex items-center gap-2 mt-4">
              {AVATAR_COLORS.map((c, i) => (
                <button key={i} onClick={() => setProfile(p => ({ ...p, avatarColor: i }))}
                  className={`w-5 h-5 rounded-full ${c} ${profile.avatarColor === i ? 'ring-2 ring-offset-1 ring-gray-900' : ''}`} />
              ))}
            </div>
          </div>

          {/* Quick stats */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 space-y-3">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Your Activity</p>
            {[
              { label: 'Records Marked',   value: stats.total        },
              { label: 'Active Projects',  value: stats.projects     },
              { label: 'Active Attendees', value: stats.attendees    },
            ].map(s => (
              <div key={s.label} className="flex items-center justify-between">
                <p className="text-xs text-gray-500">{s.label}</p>
                <p className="text-sm font-bold text-gray-900">{s.value}</p>
              </div>
            ))}
          </div>

          {/* Tab nav */}
          <nav className="bg-white rounded-2xl border border-gray-100 shadow-sm p-2 space-y-0.5">
            {tabs.map(t => {
              const icons: Record<Tab, React.ReactNode> = {
                Profile:       <Activity className="w-4 h-4" />,
                Notifications: <Bell className="w-4 h-4" />,
                Security:      <Lock className="w-4 h-4" />,
                Activity:      <Clock className="w-4 h-4" />,
              }
              return (
                <button key={t} onClick={() => setActiveTab(t)}
                  className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors text-left ${
                    activeTab === t ? 'bg-gray-900 text-white' : 'text-gray-600 hover:bg-gray-50'
                  }`}>
                  {icons[t]} {t}
                </button>
              )
            })}
          </nav>
        </div>

        {/* Right panel */}
        <div className="flex-1 space-y-5">

          {/* ── Profile tab ── */}
          {activeTab === 'Profile' && (
            <>
              {profileSaved && (
                <div className="flex items-center gap-3 p-4 bg-green-50 border border-green-200 rounded-xl text-sm font-medium text-green-800">
                  <CheckCircle className="w-4 h-4" /> Profile updated successfully!
                </div>
              )}
              <Card title="Personal Information">
                <div className="grid grid-cols-2 gap-4">
                  {[
                    { label: 'Full Name',   key: 'name',       type: 'text'  },
                    { label: 'Email',       key: 'email',      type: 'email' },
                    { label: 'Department',  key: 'department', type: 'text'  },
                    { label: 'Phone',       key: 'phone',      type: 'tel'   },
                  ].map(f => (
                    <div key={f.key}>
                      <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">{f.label}</label>
                      <input type={f.type} value={profile[f.key as keyof typeof profile] as string}
                        onChange={e => setProfile(p => ({ ...p, [f.key]: e.target.value }))}
                        className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900" />
                    </div>
                  ))}
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Org Code</label>
                    <input value={profile.orgCode as string} readOnly
                      className="w-full border border-gray-100 rounded-xl px-3 py-2.5 text-sm bg-gray-50 text-gray-400 cursor-not-allowed" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Timezone</label>
                    <select value={profile.timezone} onChange={e => setProfile(p => ({ ...p, timezone: e.target.value }))}
                      className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 bg-white">
                      {['Asia/Kolkata', 'UTC', 'America/New_York', 'America/Los_Angeles', 'Europe/London', 'Asia/Singapore'].map(tz => (
                        <option key={tz}>{tz}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </Card>

              <Card title="Role & Access">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Role</label>
                    <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-semibold ${
                      userRole === 'owner_pmo' ? 'bg-gray-900 text-white' :
                      userRole === 'pmo'       ? 'bg-blue-100 text-blue-800' :
                      userRole === 'viewer'    ? 'bg-amber-100 text-amber-800' :
                                                'bg-gray-100 text-gray-500'
                    }`}>
                      {userRole === 'owner_pmo' && <ShieldCheck className="w-3.5 h-3.5" />}
                      {userRole === 'pmo'       && <ShieldCheck className="w-3.5 h-3.5" />}
                      {userRole === 'viewer'    && <EyeIcon     className="w-3.5 h-3.5" />}
                      {ROLE_LABELS[userRole]}
                    </span>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Access Level</label>
                    <span className={`inline-block px-3 py-1.5 rounded-lg text-sm font-semibold ${
                      canEdit ? 'bg-green-100 text-green-800' : 'bg-amber-100 text-amber-800'
                    }`}>
                      {canEdit ? 'Full Access' : 'Read Only'}
                    </span>
                  </div>
                </div>
                <div className={`mt-4 flex items-start gap-2.5 px-4 py-3 rounded-xl text-xs ${
                  canEdit ? 'bg-green-50 text-green-700' : 'bg-amber-50 text-amber-700'
                }`}>
                  {canEdit
                    ? <><ShieldCheck className="w-4 h-4 mt-0.5 shrink-0" /><span>You can create, edit, and delete projects, attendees, and attendance records.</span></>
                    : <><ShieldAlert className="w-4 h-4 mt-0.5 shrink-0" /><span>You have read-only access. Contact an Owner PMO to request elevated permissions.</span></>}
                </div>
                <p className="text-xs text-gray-400 mt-3">Role and access level can only be changed by a Super Admin.</p>
              </Card>

              <div className="flex justify-end">
                <button onClick={saveProfile}
                  className="flex items-center gap-2 px-6 py-2.5 bg-gray-900 text-white rounded-xl text-sm font-semibold hover:bg-gray-800 transition-colors">
                  <Save className="w-4 h-4" /> Save Changes
                </button>
              </div>
            </>
          )}

          {/* ── Notifications tab ── */}
          {activeTab === 'Notifications' && (
            <>
              {notifSaved && (
                <div className="flex items-center gap-3 p-4 bg-green-50 border border-green-200 rounded-xl text-sm font-medium text-green-800">
                  <CheckCircle className="w-4 h-4" /> Notification preferences saved!
                </div>
              )}

              <Card title="Delivery Channels">
                <div className="grid grid-cols-2 gap-4 mb-5">
                  {[
                    { key: 'emailEnabled', label: 'Email', icon: <Mail className="w-4 h-4" />, sub: profile.email },
                    { key: 'inAppEnabled', label: 'In-App', icon: <Bell className="w-4 h-4" />, sub: 'Browser notifications' },
                    { key: 'slackEnabled', label: 'Slack', icon: <MessageSquare className="w-4 h-4" />, sub: 'Connect Slack first' },
                    { key: 'smsEnabled',   label: 'SMS',   icon: <Smartphone className="w-4 h-4" />, sub: profile.phone || 'No phone on file' },
                  ].map(ch => (
                    <div key={ch.key} className={`flex items-center gap-3 p-4 rounded-xl border-2 transition-colors ${
                      notif[ch.key as keyof typeof notif] ? 'border-gray-900 bg-gray-50' : 'border-gray-100'
                    }`}>
                      <div className="w-9 h-9 rounded-xl bg-gray-100 flex items-center justify-center shrink-0 text-gray-600">
                        {ch.icon}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-gray-900">{ch.label}</p>
                        <p className="text-[11px] text-gray-400 truncate">{ch.sub}</p>
                      </div>
                      <Toggle checked={notif[ch.key as keyof typeof notif] as boolean}
                        onChange={() => setNotif(p => ({ ...p, [ch.key]: !p[ch.key as keyof typeof p] }))} />
                    </div>
                  ))}
                </div>
                <div className="grid grid-cols-2 gap-4 pt-4 border-t border-gray-100">
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Reminder Time</label>
                    <input type="time" value={notif.reminderTime} onChange={e => setNotif(p => ({ ...p, reminderTime: e.target.value }))}
                      className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Digest Frequency</label>
                    <select value={notif.digestFrequency} onChange={e => setNotif(p => ({ ...p, digestFrequency: e.target.value as 'daily'|'weekly' }))}
                      className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 bg-white">
                      <option value="daily">Daily</option>
                      <option value="weekly">Weekly</option>
                    </select>
                  </div>
                </div>
              </Card>

              <Card title="Alert Types">
                <div className="space-y-1">
                  {[
                    { key: 'dailyReminder', label: 'Daily Attendance Reminder',  desc: 'Receive reminder before scrum time to mark attendance', icon: <Clock className="w-4 h-4 text-blue-500" /> },
                    { key: 'lateAlert',      label: 'Late Arrival Alert',          desc: 'Notified when a member joins after the grace period',    icon: <AlertTriangle className="w-4 h-4 text-orange-500" /> },
                    { key: 'absentAlert',    label: 'Absent Member Alert',          desc: 'Notified when a marked member is absent for the day',    icon: <AlertTriangle className="w-4 h-4 text-red-500" /> },
                    { key: 'weeklySummary',  label: 'Weekly Summary Report',        desc: 'Attendance summary sent every Monday morning',           icon: <Calendar className="w-4 h-4 text-green-500" /> },
                    { key: 'holidayAlert',   label: 'Holiday Reminder',             desc: 'Reminder about upcoming public holidays',                icon: <Calendar className="w-4 h-4 text-violet-500" /> },
                    { key: 'leaveApproval',  label: 'Leave Approval Request',       desc: 'Notified when a leave request requires your approval',   icon: <Bell className="w-4 h-4 text-gray-500" /> },
                    { key: 'systemUpdates',  label: 'System Updates',               desc: 'Platform updates and maintenance notifications',          icon: <Activity className="w-4 h-4 text-gray-400" /> },
                  ].map(item => (
                    <div key={item.key} className="flex items-center justify-between p-4 rounded-xl hover:bg-gray-50 transition-colors">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center shrink-0">{item.icon}</div>
                        <div>
                          <p className="text-sm font-medium text-gray-900">{item.label}</p>
                          <p className="text-xs text-gray-400 mt-0.5">{item.desc}</p>
                        </div>
                      </div>
                      <Toggle checked={notif[item.key as keyof typeof notif] as boolean}
                        onChange={() => setNotif(p => ({ ...p, [item.key]: !p[item.key as keyof typeof p] }))} />
                    </div>
                  ))}
                </div>
              </Card>

              <Card title="Alert Thresholds">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Late Alert After (min)</label>
                    <input type="number" min={1} max={60} value={notif.lateThreshold}
                      onChange={e => setNotif(p => ({ ...p, lateThreshold: Number(e.target.value) }))}
                      className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900" />
                    <p className="text-[11px] text-gray-400 mt-1">Alert if member is more than {notif.lateThreshold} min late</p>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Consecutive Absent Days</label>
                    <input type="number" min={1} max={30} value={notif.absentThreshold}
                      onChange={e => setNotif(p => ({ ...p, absentThreshold: Number(e.target.value) }))}
                      className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900" />
                    <p className="text-[11px] text-gray-400 mt-1">Alert after {notif.absentThreshold} consecutive absences</p>
                  </div>
                </div>
              </Card>

              <div className="flex justify-end">
                <button onClick={saveNotif}
                  className="flex items-center gap-2 px-6 py-2.5 bg-gray-900 text-white rounded-xl text-sm font-semibold hover:bg-gray-800 transition-colors">
                  <Save className="w-4 h-4" /> Save Preferences
                </button>
              </div>
            </>
          )}

          {/* ── Security tab ── */}
          {activeTab === 'Security' && (
            <>
              {pwdSaved && (
                <div className="flex items-center gap-3 p-4 bg-green-50 border border-green-200 rounded-xl text-sm font-medium text-green-800">
                  <CheckCircle className="w-4 h-4" /> Password updated successfully!
                </div>
              )}
              {pwdError && (
                <div className="flex items-center gap-3 p-4 bg-red-50 border border-red-200 rounded-xl text-sm font-medium text-red-800">
                  <AlertTriangle className="w-4 h-4" /> {pwdError}
                </div>
              )}
              <Card title="Change Password">
                <div className="space-y-4 max-w-md">
                  {([
                    { key: 'current',  label: 'Current Password'  },
                    { key: 'next',     label: 'New Password'       },
                    { key: 'confirm',  label: 'Confirm New Password' },
                  ] as const).map(f => (
                    <div key={f.key}>
                      <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">{f.label}</label>
                      <div className="relative">
                        <input type={showPwd[f.key] ? 'text' : 'password'} value={pwd[f.key]}
                          onChange={e => setPwd(p => ({ ...p, [f.key]: e.target.value }))}
                          className="w-full border border-gray-200 rounded-xl px-3 py-2.5 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900" />
                        <button onClick={() => setShowPwd(p => ({ ...p, [f.key]: !p[f.key] }))}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                          {showPwd[f.key] ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>
                  ))}
                  {pwd.next && (
                    <div className="space-y-1">
                      <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Strength</p>
                      <div className="flex gap-1">
                        {[pwd.next.length >= 8, /[A-Z]/.test(pwd.next), /\d/.test(pwd.next), /[^A-Za-z0-9]/.test(pwd.next)].map((ok, i) => (
                          <div key={i} className={`h-1.5 flex-1 rounded-full ${ok ? 'bg-green-500' : 'bg-gray-200'}`} />
                        ))}
                      </div>
                      <p className="text-[11px] text-gray-400">Requires 8+ chars, uppercase, and a number</p>
                    </div>
                  )}
                  <button onClick={savePwd}
                    className="flex items-center gap-2 px-5 py-2.5 bg-gray-900 text-white rounded-xl text-sm font-semibold hover:bg-gray-800 transition-colors">
                    <Lock className="w-4 h-4" /> Update Password
                  </button>
                </div>
              </Card>

              <Card title="Active Sessions">
                <div className="space-y-3">
                  {[
                    { device: 'Chrome · macOS',  ip: '192.168.1.5',   time: 'Now',         current: true  },
                    { device: 'Safari · iPhone',  ip: '103.24.45.91',  time: '2 hours ago', current: false },
                    { device: 'Firefox · Windows',ip: '45.67.89.12',   time: 'Yesterday',   current: false },
                  ].map((s, i) => (
                    <div key={i} className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                      <div>
                        <p className="text-sm font-medium text-gray-900">{s.device}</p>
                        <p className="text-xs text-gray-400">{s.ip} · {s.time}</p>
                      </div>
                      {s.current
                        ? <span className="px-2.5 py-1 bg-green-100 text-green-700 rounded-full text-[11px] font-semibold">Current</span>
                        : <button className="text-xs text-red-500 hover:text-red-700 font-medium">Revoke</button>
                      }
                    </div>
                  ))}
                </div>
              </Card>

              <Card title="Two-Factor Authentication">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-900">Authenticator App</p>
                    <p className="text-xs text-gray-400 mt-0.5">Use Google Authenticator or similar for 2FA</p>
                  </div>
                  <button className="px-4 py-2 border border-gray-200 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors">
                    Enable 2FA
                  </button>
                </div>
              </Card>
            </>
          )}

          {/* ── Activity tab ── */}
          {activeTab === 'Activity' && (
            <Card title="Recent Activity">
              <div className="space-y-1">
                {activityLog.map((item, i) => {
                  const colors = { attendance: 'bg-blue-100 text-blue-600', auth: 'bg-green-100 text-green-600', settings: 'bg-purple-100 text-purple-600' }
                  const icons  = { attendance: '📋', auth: '🔐', settings: '⚙️' }
                  return (
                    <div key={i} className="flex items-center gap-4 p-3 rounded-xl hover:bg-gray-50 transition-colors">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm shrink-0 ${colors[item.type]}`}>
                        {icons[item.type]}
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-medium text-gray-900">{item.action}</p>
                        <p className="text-xs text-gray-400">{item.date}</p>
                      </div>
                      <ChevronRight className="w-4 h-4 text-gray-300" />
                    </div>
                  )
                })}
              </div>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}
