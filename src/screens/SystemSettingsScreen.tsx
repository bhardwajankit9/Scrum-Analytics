import { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Bell, Settings, Plus, Trash2, X, Calendar, Users, Shield, Bell as BellIcon, Plug } from 'lucide-react'
import { useSettingsViewModel } from '../presentation/viewmodels/useSettingsViewModel'
import { usePermissions } from '../domain/permissions'
import { SelectDropdown } from '../components/ui/SelectDropdown'
import { DatePickerPopover } from '../components/ui/DatePickerPopover'
import { supabase } from '../lib/supabase/client'

type Tab = 'rules' | 'holidays' | 'roles' | 'notifications' | 'integrations'

export default function SystemSettingsScreen() {
  const [searchParams] = useSearchParams()
  const tabParam = searchParams.get('tab') as Tab | null
  const VALID_TABS: Tab[] = ['rules', 'holidays', 'roles', 'notifications', 'integrations']
  const [activeTab, setActiveTab] = useState<Tab>(
    tabParam && VALID_TABS.includes(tabParam) ? tabParam : 'rules'
  )
  const { projects, attendees, holidays, leaves, addHoliday, removeHoliday: deleteHoliday, addLeave, removeLeave: deleteLeave, memberships, addMembership, removeMembership: deleteMembership } = useSettingsViewModel()
  const perms = usePermissions()

  const tabs: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: 'rules',         label: 'Attendance Rules',   icon: <Settings className="w-4 h-4" /> },
    { id: 'holidays',      label: 'Holidays & Leave',   icon: <Calendar className="w-4 h-4" /> },
    { id: 'roles',         label: 'Roles & Permissions', icon: <Shield className="w-4 h-4" /> },
    { id: 'notifications', label: 'Notifications',      icon: <BellIcon className="w-4 h-4" /> },
    { id: 'integrations',  label: 'Integrations',       icon: <Plug className="w-4 h-4" /> },
  ]

  return (
    <div className="p-6 min-h-full">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">System Settings</h1>
          <p className="text-sm text-gray-400 mt-0.5">Configure rules, holidays, roles and notifications</p>
        </div>
        <div className="flex items-center gap-2">
          <button className="w-9 h-9 flex items-center justify-center rounded-lg border border-gray-200 bg-white hover:bg-gray-50">
            <Bell className="w-4 h-4 text-gray-500" />
          </button>
        </div>
      </div>

      <div className="flex gap-6">
        {/* Sidebar tabs */}
        <aside className="w-52 shrink-0">
          <nav className="bg-white rounded-xl border border-gray-100 shadow-sm p-2 space-y-0.5">
            {tabs.map(t => (
              <button key={t.id} onClick={() => setActiveTab(t.id)}
                className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors text-left ${
                  activeTab === t.id ? 'bg-gray-900 text-white' : 'text-gray-600 hover:bg-gray-50'
                }`}>
                {t.icon} {t.label}
              </button>
            ))}
          </nav>
        </aside>

        {/* Content */}
        <div className="flex-1">
          {activeTab === 'rules'         && <RulesTab projects={projects} />}
          {activeTab === 'holidays'      && <HolidaysTab projects={projects} attendees={attendees} holidays={holidays} leaves={leaves} addHoliday={addHoliday} deleteHoliday={deleteHoliday} addLeave={addLeave} deleteLeave={deleteLeave} canEdit={perms.canManageHolidays} />}
          {activeTab === 'roles'         && <RolesTab projects={projects} attendees={attendees} memberships={memberships} addMembership={addMembership} deleteMembership={deleteMembership} canEdit={perms.canManageMembers} />}
          {activeTab === 'notifications' && <NotificationsTab />}
          {activeTab === 'integrations'  && <IntegrationsTab />}
        </div>
      </div>
    </div>
  )
}

// ─── Rules Tab ────────────────────────────────────────────────────────────────

function RulesTab({ projects }: { projects: import('../data/mockData').Project[] }) {
  const [saved, setSaved] = useState(false)
  return (
    <div className="space-y-4">
      {saved && (
        <div className="flex items-center gap-3 p-4 bg-green-50 border border-green-200 rounded-xl text-sm font-medium text-green-800">
          ✓ Attendance rules saved successfully!
        </div>
      )}
      {projects.map(p => (
        <div key={p.id} className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
          <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <span className={`w-2 h-2 rounded-full ${p.status === 'active' ? 'bg-green-500' : 'bg-gray-300'}`} />
            {p.name}
          </h3>
          <div className="grid grid-cols-3 gap-4">
            {[
              { label: 'Scrum Time', value: p.scrum_time, type: 'time' },
              { label: 'Grace Period (min)', value: String(p.late_grace_minutes), type: 'number' },
              { label: 'Timezone', value: p.scrum_timezone, type: 'text' },
            ].map(field => (
              <div key={field.label}>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">{field.label}</label>
                <input type={field.type} defaultValue={field.value}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 bg-white" />
              </div>
            ))}
          </div>
        </div>
      ))}
      <div className="flex justify-end">
        <button onClick={() => { setSaved(true); setTimeout(() => setSaved(false), 3000) }}
          className="px-6 py-2.5 bg-gray-900 text-white rounded-xl text-sm font-semibold hover:bg-gray-800 transition-colors">
          Save Rules
        </button>
      </div>
    </div>
  )
}

// ─── Holidays Tab ─────────────────────────────────────────────────────────────

function HolidaysTab({ projects, attendees, holidays, leaves, addHoliday, deleteHoliday, addLeave, deleteLeave, canEdit }: {
  projects:    import('../domain/entities').Project[]
  attendees:   import('../domain/entities').Attendee[]
  holidays:    import('../domain/entities').Holiday[]
  leaves:      import('../domain/entities').Leave[]
  addHoliday:  (h: Omit<import('../domain/entities').Holiday, 'id'>) => void
  deleteHoliday:(id: string) => void
  addLeave:    (l: Omit<import('../domain/entities').Leave, 'id' | 'created_at'>) => void
  deleteLeave: (id: string) => void
  canEdit:     boolean
}) {
  const [hForm, setHForm] = useState({ project_id: projects[0]?.id ?? '', holiday_date: '', name: '' })
  const [lForm, setLForm] = useState({ project_id: projects[0]?.id ?? '', attendee_id: '', start_date: '', end_date: '', reason: '' })

  const projectAttendees = attendees.filter(a => a.project === projects.find(p => p.id === lForm.project_id)?.name)

  return (
    <div className="space-y-6">
      {/* Holidays */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
        <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2"><Calendar className="w-4 h-4" /> Public Holidays</h3>
        <div className="grid grid-cols-3 gap-3 mb-4">
          <SelectDropdown
            value={hForm.project_id}
            onChange={v => setHForm(p => ({...p, project_id: v}))}
            options={projects.map(p => ({ value: p.id, label: p.name }))}
            className="w-full"
          />
          <DatePickerPopover value={hForm.holiday_date} onChange={v => setHForm(p => ({...p, holiday_date: v}))} fullWidth placeholder="Holiday date" />
          <div className="flex gap-2">
            <input value={hForm.name} onChange={e => setHForm(p => ({...p, name: e.target.value}))}
              placeholder="Holiday name"
              className="flex-1 border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900" />
            <button onClick={() => { if (hForm.holiday_date && hForm.name) { addHoliday(hForm); setHForm(p => ({...p, holiday_date: '', name: ''})) } }}
              disabled={!canEdit}
              className="px-3 py-2 bg-gray-900 text-white rounded-xl hover:bg-gray-800 disabled:opacity-40 disabled:cursor-not-allowed">
              <Plus className="w-4 h-4" />
            </button>
          </div>
        </div>
        <div className="space-y-2">
          {holidays.length === 0 && <p className="text-sm text-gray-400 text-center py-4">No holidays added yet.</p>}
          {holidays.map(h => {
            const proj = projects.find(p => p.id === h.project_id)
            return (
              <div key={h.id} className="flex items-center justify-between px-4 py-3 bg-gray-50 rounded-lg">
                <div>
                  <p className="text-sm font-medium text-gray-900">{h.name}</p>
                  <p className="text-xs text-gray-400">{proj?.name} · {new Date(h.holiday_date + 'T00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}</p>
                </div>
                <button onClick={() => deleteHoliday(h.id)} disabled={!canEdit} className="text-gray-300 hover:text-red-500 transition-colors disabled:opacity-30 disabled:cursor-not-allowed">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            )
          })}
        </div>
      </div>

      {/* Leaves */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
        <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2"><Users className="w-4 h-4" /> Leave Management</h3>
        <div className="grid grid-cols-2 gap-3 mb-4">
          <SelectDropdown
            value={lForm.project_id}
            onChange={v => setLForm(p => ({...p, project_id: v, attendee_id: ''}))}
            options={projects.map(p => ({ value: p.id, label: p.name }))}
            className="w-full"
          />
          <SelectDropdown
            value={lForm.attendee_id}
            onChange={v => setLForm(p => ({...p, attendee_id: v}))}
            options={[{ value: '', label: 'Select attendee' }, ...projectAttendees.map(a => ({ value: a.id, label: a.name }))]}
            placeholder="Select attendee"
            className="w-full"
          />
          <DatePickerPopover value={lForm.start_date} onChange={v => setLForm(p => ({...p, start_date: v}))} fullWidth placeholder="Start date" />
          <DatePickerPopover value={lForm.end_date}   onChange={v => setLForm(p => ({...p, end_date: v}))}   fullWidth placeholder="End date" />
          <div className="col-span-2 flex gap-2">
            <input value={lForm.reason} onChange={e => setLForm(p => ({...p, reason: e.target.value}))}
              placeholder="Reason for leave"
              className="flex-1 border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900" />
            <button onClick={() => {
              if (lForm.attendee_id && lForm.start_date && lForm.end_date) {
                addLeave({ ...lForm, approved_by: 'Admin User' })
                setLForm(p => ({...p, attendee_id: '', start_date: '', end_date: '', reason: ''}))
              }
            }} disabled={!canEdit} className="px-3 py-2 bg-gray-900 text-white rounded-xl hover:bg-gray-800 disabled:opacity-40 disabled:cursor-not-allowed">
              <Plus className="w-4 h-4" />
            </button>
          </div>
        </div>
        <div className="space-y-2">
          {leaves.length === 0 && <p className="text-sm text-gray-400 text-center py-4">No leaves recorded yet.</p>}
          {leaves.map(l => {
            const attendee = attendees.find(a => a.id === l.attendee_id)
            const project  = projects.find(p => p.id === l.project_id)
            return (
              <div key={l.id} className="flex items-center justify-between px-4 py-3 bg-gray-50 rounded-lg">
                <div>
                  <p className="text-sm font-medium text-gray-900">{attendee?.name ?? 'Unknown'}</p>
                  <p className="text-xs text-gray-400">{project?.name} · {l.start_date} → {l.end_date} · {l.reason}</p>
                </div>
                <button onClick={() => deleteLeave(l.id)} disabled={!canEdit} className="text-gray-300 hover:text-red-500 transition-colors disabled:opacity-30 disabled:cursor-not-allowed">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

// ─── Roles Tab ────────────────────────────────────────────────────────────────

function RolesTab({ projects, attendees, memberships, addMembership, deleteMembership, canEdit }: {
  projects:         import('../domain/entities').Project[]
  attendees:        import('../domain/entities').Attendee[]
  memberships:      import('../domain/entities').ProjectMembership[]
  addMembership:    (m: Omit<import('../domain/entities').ProjectMembership, 'id'>) => void
  deleteMembership: (id: string) => void
  canEdit:          boolean
}) {
  const [form, setForm] = useState({ project_id: projects[0]?.id ?? '', user_name: '', user_email: '', role: 'pmo' as 'owner_pmo'|'pmo'|'viewer' })

  const ROLE_COLORS: Record<string, string> = {
    owner_pmo: 'bg-purple-100 text-purple-700',
    pmo:       'bg-blue-100 text-blue-700',
    viewer:    'bg-gray-100 text-gray-600',
  }
  const ROLE_LABELS: Record<string, string> = {
    owner_pmo: 'Owner / PMO',
    pmo:       'PMO',
    viewer:    'Viewer',
  }

  return (
    <div className="space-y-6">
      {/* Add member */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
        <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2"><Shield className="w-4 h-4" /> Add Project Member</h3>
        <div className="grid grid-cols-4 gap-3">
          <SelectDropdown
            value={form.project_id}
            onChange={v => setForm(p => ({...p, project_id: v}))}
            options={projects.map(p => ({ value: p.id, label: p.name }))}
            className="w-full"
          />
          <input value={form.user_name} onChange={e => setForm(p => ({...p, user_name: e.target.value}))}
            placeholder="Full name"
            className="border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900" />
          <input value={form.user_email} onChange={e => setForm(p => ({...p, user_email: e.target.value}))}
            placeholder="email@company.com"
            className="border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900" />
          <div className="flex gap-2">
            <SelectDropdown
              value={form.role}
              onChange={v => setForm(p => ({...p, role: v as 'owner_pmo'|'pmo'|'viewer'}))}
              options={[
                { value: 'owner_pmo', label: 'Owner / PMO' },
                { value: 'pmo',       label: 'PMO'         },
                { value: 'viewer',    label: 'Viewer'      },
              ]}
              className="flex-1"
            />
            <button onClick={() => {
              if (form.user_name && form.user_email) {
                addMembership({ project_id: form.project_id, user_name: form.user_name, user_email: form.user_email, role: form.role })
                setForm(p => ({...p, user_name: '', user_email: ''}))
              }
            }} disabled={!canEdit} className="px-3 py-2 bg-gray-900 text-white rounded-xl hover:bg-gray-800 disabled:opacity-40 disabled:cursor-not-allowed">
              <Plus className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Members per project */}
      {projects.map(proj => {
        const projMembers = memberships.filter(m => m.project_id === proj.id)
        return (
          <div key={proj.id} className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
            <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <span className={`w-2 h-2 rounded-full ${proj.status === 'active' ? 'bg-green-500' : 'bg-gray-300'}`} />
              {proj.name}
              <span className="text-xs text-gray-400 font-normal ml-1">{projMembers.length} member{projMembers.length !== 1 ? 's' : ''}</span>
            </h3>
            {projMembers.length === 0 && <p className="text-sm text-gray-400">No members assigned.</p>}
            <div className="space-y-2">
              {projMembers.map(m => (
                <div key={m.id} className="flex items-center justify-between px-4 py-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-xs font-bold text-gray-600">
                      {m.user_name.split(' ').map((n: string) => n[0]).join('')}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">{m.user_name}</p>
                      <p className="text-xs text-gray-400">{m.user_email}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={`px-2.5 py-1 rounded-lg text-xs font-semibold ${ROLE_COLORS[m.role]}`}>{ROLE_LABELS[m.role]}</span>
                    <button onClick={() => deleteMembership(m.id)} disabled={!canEdit} className="text-gray-300 hover:text-red-500 transition-colors disabled:opacity-30 disabled:cursor-not-allowed">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ─── Notifications Tab ────────────────────────────────────────────────────────

function NotificationsTab() {
  const { attendees, projects } = useSettingsViewModel()

  const Toggle = ({ checked, onChange }: { checked: boolean; onChange: () => void }) => (
    <button onClick={onChange}
      className={`relative rounded-full transition-colors shrink-0 ${checked ? 'bg-gray-900' : 'bg-gray-200'}`}
      style={{ height: 22, width: 40 }}>
      <span className="absolute bg-white rounded-full shadow transition-all"
        style={{ width: 18, height: 18, top: 2, left: checked ? 20 : 2 }} />
    </button>
  )

  const [settings, setSettings] = useState({
    dailyReminder:    true,
    lateAlert:        true,
    absentAlert:      false,
    weeklySummary:    true,
    holidayAlert:     true,
    leaveAlert:       true,
    escalationAlert:  false,
    reminderTime:     '09:45',
    reminderMethod:   'email' as 'email' | 'slack' | 'both',
    lateThreshold:    5,
    absentThreshold:  2,
    sendgridApiKey:   '',
    sendgridFromEmail:'',
    slackWebhookUrl:  '',
  })

  // Load persisted settings from Supabase on mount
  useEffect(() => {
    supabase
      .from('notification_settings')
      .select('*')
      .eq('config_key', 'global')
      .maybeSingle()
      .then(({ data }) => {
        if (!data) return
        const ea = (data.enabled_alerts ?? {}) as Record<string, boolean>
        setSettings(prev => ({
          ...prev,
          dailyReminder:    ea['dailyReminder']   ?? prev.dailyReminder,
          lateAlert:        ea['lateAlert']        ?? prev.lateAlert,
          absentAlert:      ea['absentAlert']      ?? prev.absentAlert,
          weeklySummary:    ea['weeklySummary']    ?? prev.weeklySummary,
          holidayAlert:     ea['holidayAlert']     ?? prev.holidayAlert,
          leaveAlert:       ea['leaveAlert']       ?? prev.leaveAlert,
          escalationAlert:  ea['escalationAlert']  ?? prev.escalationAlert,
          reminderTime:     data.reminder_time     ?? prev.reminderTime,
          reminderMethod:   (data.delivery_method  ?? prev.reminderMethod) as 'email' | 'slack' | 'both',
          lateThreshold:    data.late_threshold    ?? prev.lateThreshold,
          sendgridApiKey:   data.sendgrid_api_key  ?? '',
          sendgridFromEmail:data.sendgrid_from_email ?? '',
          slackWebhookUrl:  data.slack_webhook_url ?? '',
        }))
        if (Array.isArray(data.recipients) && data.recipients.length > 0) {
          setRecipients(data.recipients as Recipient[])
        }
      })
  }, [])

  type Recipient = { id: string; name: string; email: string; role: 'pmo' | 'manager' | 'hr'; project: string; alerts: string[] }
  const [recipients, setRecipients] = useState<Recipient[]>([
    { id: 'r1', name: 'Admin User',   email: 'admin@company.com',  role: 'pmo',     project: 'All', alerts: ['dailyReminder','lateAlert','weeklySummary'] },
    { id: 'r2', name: 'John PMO',     email: 'john@company.com',   role: 'pmo',     project: 'Project Alpha', alerts: ['lateAlert','absentAlert'] },
    { id: 'r3', name: 'Raj PMO',      email: 'raj@company.com',    role: 'pmo',     project: 'Project Gamma', alerts: ['weeklySummary'] },
  ])
  const [showAddRecipient, setShowAddRecipient] = useState(false)
  const [newRec, setNewRec] = useState({ name: '', email: '', role: 'pmo' as 'pmo'|'manager'|'hr', project: 'All' })

  const ALERT_KEYS = ['dailyReminder','lateAlert','absentAlert','weeklySummary','holidayAlert']
  const ALERT_LABELS: Record<string, string> = {
    dailyReminder: 'Daily Reminder', lateAlert: 'Late Alert', absentAlert: 'Absent Alert',
    weeklySummary: 'Weekly Summary', holidayAlert: 'Holiday Alert',
  }

  // Real notification log from Supabase
  type LogEntry = { time: string; event: string; detail: string; type: 'info' | 'warn' | 'error' }
  const [notifLog, setNotifLog] = useState<LogEntry[]>([])
  const [logLoading, setLogLoading] = useState(false)

  const [saved, setSaved] = useState(false)
  const [saving, setSaving] = useState(false)
  const [activeSubTab, setActiveSubTab] = useState<'alerts' | 'recipients' | 'log'>('alerts')

  useEffect(() => {
    if (activeSubTab !== 'log') return
    setLogLoading(true)
    supabase
      .from('notifications')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(20)
      .then(({ data }) => {
        const WARN_TYPES = ['late_arrival', 'escalation_alert']
        const ERR_TYPES  = ['high_absenteeism']
        setNotifLog(
          (data ?? []).map(n => ({
            time:   new Date(n.created_at).toLocaleString(),
            event:  n.title,
            detail: n.message,
            type:   ERR_TYPES.includes(n.alert_type)  ? 'error'
                  : WARN_TYPES.includes(n.alert_type) ? 'warn'
                  : 'info',
          }))
        )
        setLogLoading(false)
      })
  }, [activeSubTab])

  async function handleSave() {
    setSaving(true)
    const { dailyReminder, lateAlert, absentAlert, weeklySummary, holidayAlert, leaveAlert, escalationAlert } = settings
    await supabase
      .from('notification_settings')
      .upsert({
        config_key:          'global',
        enabled_alerts:      { dailyReminder, lateAlert, absentAlert, weeklySummary, holidayAlert, leaveAlert, escalationAlert },
        delivery_method:     settings.reminderMethod,
        reminder_time:       settings.reminderTime,
        late_threshold:      settings.lateThreshold,
        sendgrid_api_key:    settings.sendgridApiKey,
        sendgrid_from_email: settings.sendgridFromEmail,
        slack_webhook_url:   settings.slackWebhookUrl,
        recipients:          recipients,
        updated_at:          new Date().toISOString(),
      }, { onConflict: 'config_key' })
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 3000)
  }

  const subTabs = [
    { id: 'alerts' as const,     label: 'Alert Types'      },
    { id: 'recipients' as const, label: 'Recipients'        },
    { id: 'log' as const,        label: 'Notification Log'  },
  ]

  return (
    <div className="space-y-4">
      {saved && (
        <div className="flex items-center gap-3 p-4 bg-green-50 border border-green-200 rounded-xl text-sm font-medium text-green-800">
          ✓ Notification settings saved.
        </div>
      )}

      {/* Sub-tabs */}
      <div className="flex gap-1 bg-gray-100 rounded-xl p-1 w-fit">
        {subTabs.map(t => (
          <button key={t.id} onClick={() => setActiveSubTab(t.id)}
            className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              activeSubTab === t.id ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
            }`}>{t.label}</button>
        ))}
      </div>

      {/* ── Alert Types sub-tab ── */}
      {activeSubTab === 'alerts' && (
        <>
          {/* Delivery settings */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
            <h3 className="font-semibold text-gray-900 mb-5">Delivery Settings</h3>
            <div className="grid grid-cols-3 gap-4 mb-5">
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Reminder Time</label>
                <input type="time" value={settings.reminderTime} onChange={e => setSettings(p => ({...p, reminderTime: e.target.value}))}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Delivery Method</label>
                <SelectDropdown
                  value={settings.reminderMethod}
                  onChange={v => setSettings(p => ({...p, reminderMethod: v as 'email'|'slack'|'both'}))}
                  options={[
                    { value: 'email', label: 'Email (SendGrid)' },
                    { value: 'slack', label: 'Slack' },
                    { value: 'both',  label: 'Both' },
                  ]}
                  className="w-full"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Late Threshold (min)</label>
                <input type="number" min={1} max={60} value={settings.lateThreshold}
                  onChange={e => setSettings(p => ({...p, lateThreshold: Number(e.target.value)}))}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900" />
              </div>
            </div>

            {/* SendGrid Config */}
            <div className="pt-5 border-t border-gray-100">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-5 h-5 rounded bg-[#1A82E2] flex items-center justify-center">
                  <span className="text-white text-[9px] font-bold">SG</span>
                </div>
                <h4 className="text-sm font-semibold text-gray-900">SendGrid Email Config</h4>
                <span className="px-2 py-0.5 bg-amber-50 text-amber-700 border border-amber-200 text-[10px] font-semibold rounded-full">Required for email delivery</span>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">API Key</label>
                  <input
                    type="password"
                    placeholder="SG.xxxxxxxxxxxxxxxxxxxx"
                    value={settings.sendgridApiKey}
                    onChange={e => setSettings(p => ({...p, sendgridApiKey: e.target.value}))}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 font-mono"
                  />
                  <p className="text-[11px] text-gray-400 mt-1">Get from <a href="https://app.sendgrid.com/settings/api_keys" target="_blank" rel="noreferrer" className="text-blue-500 hover:underline">sendgrid.com → Settings → API Keys</a></p>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">From Email</label>
                  <input
                    type="email"
                    placeholder="notifications@yourcompany.com"
                    value={settings.sendgridFromEmail}
                    onChange={e => setSettings(p => ({...p, sendgridFromEmail: e.target.value}))}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
                  />
                  <p className="text-[11px] text-gray-400 mt-1">Must be a verified sender in SendGrid</p>
                </div>
              </div>
            </div>

            {/* Slack Config */}
            <div className="pt-5 border-t border-gray-100 mt-5">
              <h4 className="text-sm font-semibold text-gray-900 mb-3">💬 Slack Webhook (optional)</h4>
              <input
                type="password"
                placeholder="https://hooks.slack.com/services/..."
                value={settings.slackWebhookUrl}
                onChange={e => setSettings(p => ({...p, slackWebhookUrl: e.target.value}))}
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 font-mono"
              />
              <p className="text-[11px] text-gray-400 mt-1">Create an incoming webhook at <a href="https://api.slack.com/apps" target="_blank" rel="noreferrer" className="text-blue-500 hover:underline">api.slack.com/apps</a></p>
            </div>
          </div>

          {/* Alert type toggles */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
            <h3 className="font-semibold text-gray-900 mb-5">Alert Types</h3>
            <div className="space-y-1">
              {[
                { key: 'dailyReminder',   label: 'Daily Attendance Reminder',   desc: 'Send reminder before scrum to mark attendance' },
                { key: 'lateAlert',       label: 'Late Arrival Alert',           desc: 'Notify when a member joins after grace period' },
                { key: 'absentAlert',     label: 'Absent Member Alert',          desc: 'Notify when a marked member is absent' },
                { key: 'weeklySummary',   label: 'Weekly Summary Report',        desc: 'Send attendance summary every Monday morning' },
                { key: 'holidayAlert',    label: 'Holiday Reminder',             desc: 'Remind team about upcoming public holidays' },
                { key: 'leaveAlert',      label: 'Leave Approval Request',       desc: 'Notify when a leave request is submitted' },
                { key: 'escalationAlert', label: 'Escalation Alert',             desc: `Alert after ${settings.absentThreshold} consecutive absences` },
              ].map(item => (
                <div key={item.key} className="flex items-center justify-between px-4 py-3 rounded-xl hover:bg-gray-50 transition-colors">
                  <div>
                    <p className="text-sm font-medium text-gray-900">{item.label}</p>
                    <p className="text-xs text-gray-400 mt-0.5">{item.desc}</p>
                  </div>
                  <Toggle checked={settings[item.key as keyof typeof settings] as boolean}
                    onChange={() => setSettings(p => ({...p, [item.key]: !p[item.key as keyof typeof p]}))} />
                </div>
              ))}
            </div>
          </div>

          <div className="flex justify-end">
            <button
              onClick={() => void handleSave()}
              disabled={saving}
              className="px-6 py-2.5 bg-gray-900 text-white rounded-xl text-sm font-semibold hover:bg-gray-800 disabled:opacity-60 transition-colors">
              {saving ? 'Saving…' : 'Save Settings'}
            </button>
          </div>
        </>
      )}

      {/* ── Recipients sub-tab ── */}
      {activeSubTab === 'recipients' && (
        <>
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
              <div>
                <h3 className="font-semibold text-gray-900">Notification Recipients</h3>
                <p className="text-xs text-gray-400 mt-0.5">Who receives which alerts</p>
              </div>
              <button onClick={() => setShowAddRecipient(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-900 text-white text-xs font-medium rounded-lg hover:bg-gray-800">
                <Plus className="w-3.5 h-3.5" /> Add Recipient
              </button>
            </div>
            <div className="divide-y divide-gray-50">
              {recipients.map(r => (
                <div key={r.id} className="p-4 flex items-start gap-4">
                  <div className="w-9 h-9 rounded-full bg-gray-800 flex items-center justify-center text-xs font-bold text-white shrink-0">
                    {r.name.split(' ').map((n: string) => n[0]).join('')}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="text-sm font-semibold text-gray-900">{r.name}</p>
                      <span className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded text-[10px] font-semibold uppercase">{r.role}</span>
                      <span className="px-2 py-0.5 bg-blue-50 text-blue-600 rounded text-[10px] font-medium">{r.project}</span>
                    </div>
                    <p className="text-xs text-gray-400">{r.email}</p>
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {ALERT_KEYS.map(k => (
                        <button key={k} onClick={() => setRecipients(prev => prev.map(rec =>
                          rec.id === r.id
                            ? { ...rec, alerts: rec.alerts.includes(k) ? rec.alerts.filter(a => a !== k) : [...rec.alerts, k] }
                            : rec
                        ))}
                          className={`px-2 py-0.5 rounded-full text-[11px] font-medium border transition-colors ${
                            r.alerts.includes(k) ? 'bg-gray-900 text-white border-gray-900' : 'bg-white text-gray-400 border-gray-200 hover:border-gray-400'
                          }`}>
                          {ALERT_LABELS[k]}
                        </button>
                      ))}
                    </div>
                  </div>
                  <button onClick={() => setRecipients(prev => prev.filter(rec => rec.id !== r.id))}
                    className="text-gray-300 hover:text-red-500 transition-colors mt-1 shrink-0">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Per-attendee notification prefs */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100">
              <h3 className="font-semibold text-gray-900">Attendee Alert Subscriptions</h3>
              <p className="text-xs text-gray-400 mt-0.5">Toggle which attendees receive personal alerts</p>
            </div>
            <div className="divide-y divide-gray-50">
              {attendees.filter(a => a.status !== 'inactive').slice(0, 8).map(a => (
                <div key={a.id} className="flex items-center justify-between px-5 py-3">
                  <div className="flex items-center gap-3">
                    <div className="w-7 h-7 rounded-full bg-gray-200 flex items-center justify-center text-xs font-bold text-gray-600">
                      {a.name.split(' ').map((n: string) => n[0]).join('')}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">{a.name}</p>
                      <p className="text-xs text-gray-400">{a.project} · {a.email}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${
                      a.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
                    }`}>{a.status === 'on_leave' ? 'On Leave' : 'Active'}</span>
                    <Toggle checked={a.status === 'active'} onChange={() => {}} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Save recipients button */}
          <div className="flex justify-end">
            <button
              onClick={() => void handleSave()}
              disabled={saving}
              className="px-6 py-2.5 bg-gray-900 text-white rounded-xl text-sm font-semibold hover:bg-gray-800 disabled:opacity-60 transition-colors">
              {saving ? 'Saving…' : 'Save Recipients'}
            </button>
          </div>

          {/* Add Recipient Modal */}
          {showAddRecipient && (
            <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={() => setShowAddRecipient(false)}>
              <div className="bg-white rounded-2xl shadow-xl w-full max-w-md" onClick={e => e.stopPropagation()}>
                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
                  <h2 className="font-semibold text-gray-900">Add Notification Recipient</h2>
                  <button onClick={() => setShowAddRecipient(false)}><X className="w-5 h-5 text-gray-400" /></button>
                </div>
                <div className="p-6 space-y-4">
                  {[{ label: 'Name', key: 'name', type: 'text' }, { label: 'Email', key: 'email', type: 'email' }].map(f => (
                    <div key={f.key}>
                      <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">{f.label}</label>
                      <input type={f.type} value={(newRec as Record<string, string>)[f.key]}
                        onChange={e => setNewRec(p => ({ ...p, [f.key]: e.target.value }))}
                        className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900" />
                    </div>
                  ))}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Role</label>
                      <SelectDropdown
                        value={newRec.role}
                        onChange={v => setNewRec(p => ({ ...p, role: v as 'pmo'|'manager'|'hr' }))}
                        options={[
                          { value: 'pmo',     label: 'PMO'     },
                          { value: 'manager', label: 'Manager' },
                          { value: 'hr',      label: 'HR'      },
                        ]}
                        className="w-full"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Project Scope</label>
                      <SelectDropdown
                        value={newRec.project}
                        onChange={v => setNewRec(p => ({ ...p, project: v }))}
                        options={[
                          { value: 'All', label: 'All Projects' },
                          ...projects.filter(p => p.status === 'active').map(p => ({ value: p.name, label: p.name })),
                        ]}
                        className="w-full"
                      />
                    </div>
                  </div>
                </div>
                <div className="flex justify-end gap-3 px-6 py-4 border-t border-gray-100">
                  <button onClick={() => setShowAddRecipient(false)}
                    className="px-4 py-2 border border-gray-200 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50">Cancel</button>
                  <button onClick={() => {
                    if (!newRec.name || !newRec.email) return
                    setRecipients(prev => [...prev, { id: `r${Date.now()}`, ...newRec, alerts: ['dailyReminder'] }])
                    setNewRec({ name: '', email: '', role: 'pmo', project: 'All' })
                    setShowAddRecipient(false)
                  }} className="px-5 py-2 bg-gray-900 text-white rounded-xl text-sm font-semibold hover:bg-gray-800">Add</button>
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {/* ── Notification Log sub-tab ── */}
      {activeSubTab === 'log' && (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
            <h3 className="font-semibold text-gray-900">Notification History</h3>
            <p className="text-xs text-gray-400">{logLoading ? 'Loading…' : `${notifLog.length} recent events`}</p>
          </div>
          {logLoading ? (
            <div className="py-8 text-center text-gray-400 text-sm">Loading…</div>
          ) : notifLog.length === 0 ? (
            <div className="py-12 flex flex-col items-center gap-2 text-gray-400">
              <BellIcon className="w-8 h-8 opacity-20" />
              <p className="text-sm">No notifications sent yet</p>
              <p className="text-xs">Once the migration is applied and alerts fire, they'll appear here.</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-50">
              {notifLog.map((n, i) => {
                const colors = { info: 'bg-blue-100 text-blue-600', warn: 'bg-orange-100 text-orange-600', error: 'bg-red-100 text-red-600' }
                const icons  = { info: '📢', warn: '⚠️', error: '🚨' }
                return (
                  <div key={i} className="flex items-start gap-4 px-5 py-4">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm shrink-0 ${colors[n.type]}`}>
                      {icons[n.type]}
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-gray-900">{n.event}</p>
                      <p className="text-xs text-gray-400 mt-0.5">{n.detail}</p>
                    </div>
                    <p className="text-[11px] text-gray-400 shrink-0">{n.time}</p>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ─── Integrations Tab ─────────────────────────────────────────────────────────

function IntegrationsTab() {
  const integrations = [
    { name: 'Slack', desc: 'Send attendance reminders and summaries to Slack channels.', icon: '💬', connected: false },
    { name: 'Google Calendar', desc: 'Sync holidays and leave calendar with Google Calendar.', icon: '📅', connected: false },
    { name: 'Microsoft Teams', desc: 'Send notifications and reports via Microsoft Teams.', icon: '🔷', connected: false },
    { name: 'Jira', desc: 'Link attendance tracking with active Jira sprints.', icon: '⚡', connected: false },
    { name: 'GitHub', desc: 'Correlate commit activity with attendance patterns.', icon: '🐙', connected: false },
  ]
  return (
    <div className="grid grid-cols-2 gap-4">
      {integrations.map(i => (
        <div key={i.name} className="bg-white rounded-xl border border-gray-100 shadow-sm p-6 flex items-start gap-4">
          <div className="w-12 h-12 bg-gray-100 rounded-xl flex items-center justify-center text-2xl shrink-0">{i.icon}</div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-gray-900">{i.name}</p>
            <p className="text-xs text-gray-400 mt-1 mb-3">{i.desc}</p>
            <button className="px-4 py-1.5 border border-gray-200 rounded-lg text-xs font-medium text-gray-700 hover:bg-gray-50 transition-colors">
              Connect
            </button>
          </div>
        </div>
      ))}
    </div>
  )
}
