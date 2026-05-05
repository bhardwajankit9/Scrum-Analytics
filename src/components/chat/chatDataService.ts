/**
 * chatDataService.ts
 * Fetches real-time data from Supabase to inject as context into the AI chat.
 * Each function returns a plain-text summary the AI can reason over.
 */

import { supabase } from '../../lib/supabase/client'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any

function today(): string {
  return new Date().toISOString().split('T')[0]
}

// ── Per-query timeout wrapper ─────────────────────────────────────────────────
async function queryWithTimeout(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  queryPromise: Promise<any>,
  label: string,
  ms = 8000,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
): Promise<{ data: any[] | null; error: any }> {
  const timeout = new Promise<{ data: null; error: any }>(resolve =>
    setTimeout(() => resolve({ data: null, error: { message: `Timeout after ${ms}ms`, code: 'TIMEOUT' } }), ms)
  )
  const result = await Promise.race([queryPromise, timeout])
  if (result.error) {
    console.error(`[chatDataService] ${label}:`, result.error.message, '| code:', result.error.code)
  } else {
    console.log(`[chatDataService] ${label}: OK (${Array.isArray(result.data) ? result.data.length : 1} rows)`)
  }
  return result
}

// ── Debug helper — call this to diagnose connection issues ────────────────────
export async function debugDbConnection(): Promise<string> {
  const lines: string[] = [`🔍 DB Debug Report — ${new Date().toISOString()}`]

  // 1. Check auth session
  try {
    const { data: { session }, error } = await supabase.auth.getSession()
    if (error) lines.push(`❌ Auth error: ${error.message}`)
    else if (!session) lines.push('⚠️ No active session — user is not logged in (RLS will block queries)')
    else lines.push(`✅ Auth session: ${session.user.email}`)
  } catch (e) {
    lines.push(`❌ Auth exception: ${e}`)
  }

  // 2. Test attendees table
  try {
    const { data, error, count } = await db
      .from('attendees')
      .select('id, name', { count: 'exact' })
      .limit(3)
    if (error) lines.push(`❌ attendees error: ${error.message} (code: ${error.code})`)
    else lines.push(`✅ attendees table: ${count ?? data?.length ?? 0} total rows, sample: ${data?.map((r: any) => r.name).join(', ') || 'none'}`)
  } catch (e) {
    lines.push(`❌ attendees exception: ${e}`)
  }

  // 3. Test attendance_entries for today
  try {
    const { data, error } = await db
      .from('attendance_entries')
      .select('id, status')
      .eq('date', today())
      .limit(5)
    if (error) lines.push(`❌ attendance_entries error: ${error.message}`)
    else lines.push(`✅ attendance_entries today: ${data?.length ?? 0} rows`)
  } catch (e) {
    lines.push(`❌ attendance_entries exception: ${e}`)
  }

  // 4. Test leaves table
  try {
    const { data, error } = await db
      .from('leaves')
      .select('id')
      .limit(3)
    if (error) lines.push(`❌ leaves error: ${error.message}`)
    else lines.push(`✅ leaves table: ${data?.length ?? 0} rows`)
  } catch (e) {
    lines.push(`❌ leaves exception: ${e}`)
  }

  return lines.join('\n')
}

// ── Absent / on leave today ───────────────────────────────────────────────────
export async function getAbsentToday(): Promise<string> {
  const date = today()
  console.log('[chatDataService] getAbsentToday for date:', date)

  const { data: absentEntries } = await queryWithTimeout(
    db.from('attendance_entries').select('attendee_id, notes').eq('date', date).eq('status', 'absent'),
    'attendance_entries(absent)'
  )

  const { data: onLeave } = await queryWithTimeout(
    db.from('leaves').select('attendee_id, reason, approved_by').lte('start_date', date).gte('end_date', date),
    'leaves(today)'
  )

  const { data: allAttendees } = await queryWithTimeout(
    db.from('attendees').select('id, name, role, project').eq('status', 'active'),
    'attendees(active)'
  )

  console.log('[chatDataService] results — absent:', absentEntries?.length, 'onLeave:', onLeave?.length, 'attendees:', allAttendees?.length)

  if (!allAttendees) return 'Could not fetch attendance data.'

  const nameMap: Record<string, { name: string; role: string; project: string }> = {}
  allAttendees.forEach((a: any) => { nameMap[a.id] = { name: a.name, role: a.role, project: a.project } })

  const leaveIds = new Set<string>((onLeave || []).map((l: any) => l.attendee_id))
  const absentIds = new Set<string>((absentEntries || []).map((e: any) => e.attendee_id))

  const leaveList = [...leaveIds].map((id: string) => {
    const a = nameMap[id]
    const l = (onLeave || []).find((x: any) => x.attendee_id === id)
    return a ? `• ${a.name} (${a.role}) — On approved leave${l?.reason ? `: ${l.reason}` : ''}` : null
  }).filter(Boolean)

  const absentList = [...absentIds].filter((id: string) => !leaveIds.has(id)).map((id: string) => {
    const a = nameMap[id]
    return a ? `• ${a.name} (${a.role}) — Absent` : null
  }).filter(Boolean)

  const all = [...leaveList, ...absentList]
  if (all.length === 0) return `No absences recorded for today (${date}). All team members are present.`

  return `Absent / On Leave today (${date}):\n${all.join('\n')}\n\nTotal: ${all.length} member(s) absent out of ${allAttendees.length}.`
}

// ── Attendance summary for today ──────────────────────────────────────────────
export async function getAttendanceSummaryToday(): Promise<string> {
  const date = today()

  const { data: entries } = await queryWithTimeout(
    db.from('attendance_entries').select('attendee_id, status, join_time, minutes_late, work_mode').eq('date', date),
    'attendance_entries(summary)'
  )

  const { data: allAttendees } = await queryWithTimeout(
    db.from('attendees').select('id, name, role').eq('status', 'active'),
    'attendees(summary)'
  )

  if (!entries || !allAttendees) return 'Could not fetch attendance data.'

  const present = entries.filter((e: any) => e.status === 'present').length
  const late    = entries.filter((e: any) => e.status === 'late').length
  const absent  = entries.filter((e: any) => e.status === 'absent').length
  const total   = allAttendees.length
  const notMarked = total - entries.length

  return `Attendance Summary for ${date}:
• Present: ${present}
• Late: ${late}
• Absent: ${absent}
• Not yet marked: ${notMarked}
• Total team members: ${total}
• Attendance rate: ${total > 0 ? Math.round(((present + late) / total) * 100) : 0}%`
}

// ── Late arrivals today ───────────────────────────────────────────────────────
export async function getLateToday(): Promise<string> {
  const date = today()

  const { data: lateEntries } = await queryWithTimeout(
    db.from('attendance_entries').select('attendee_id, join_time, minutes_late').eq('date', date).eq('status', 'late'),
    'attendance_entries(late)'
  )

  const { data: allAttendees } = await queryWithTimeout(
    db.from('attendees').select('id, name, role'),
    'attendees(late)'
  )

  if (!lateEntries || lateEntries.length === 0) return `No late arrivals recorded for today (${date}).`

  const nameMap: Record<string, { name: string; role: string }> = {}
  ;(allAttendees || []).forEach((a: any) => { nameMap[a.id] = { name: a.name, role: a.role } })

  const list = lateEntries.map((e: any) => {
    const a = nameMap[e.attendee_id]
    return a ? `• ${a.name} (${a.role}) — joined at ${e.join_time || 'N/A'}, ${e.minutes_late} min late` : null
  }).filter(Boolean)

  return `Late arrivals today (${date}):\n${list.join('\n')}`
}

// ── Top performers (by attendance % this month) ───────────────────────────────
export async function getTopPerformers(limit = 5): Promise<string> {
  const now = new Date()
  const monthStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`
  const monthEnd   = today()

  const { data: entries } = await queryWithTimeout(
    db.from('attendance_entries').select('attendee_id, status').gte('date', monthStart).lte('date', monthEnd),
    'attendance_entries(top-performers)'
  )

  const { data: allAttendees } = await queryWithTimeout(
    db.from('attendees').select('id, name, role').eq('status', 'active'),
    'attendees(top-performers)'
  )

  if (!entries || !allAttendees) return 'Could not fetch data.'

  const totals: Record<string, { present: number; total: number; name: string; role: string }> = {}
  allAttendees.forEach((a: any) => { totals[a.id] = { present: 0, total: 0, name: a.name, role: a.role } })
  entries.forEach((e: any) => {
    if (!totals[e.attendee_id]) return
    totals[e.attendee_id].total++
    if (e.status === 'present' || e.status === 'late') totals[e.attendee_id].present++
  })

  const ranked = Object.values(totals)
    .filter(t => t.total > 0)
    .map(t => ({ ...t, pct: Math.round((t.present / t.total) * 100) }))
    .sort((a, b) => b.pct - a.pct)
    .slice(0, limit)

  if (ranked.length === 0) return 'No attendance data found for this month.'

  const list = ranked.map((r, i) => `${i + 1}. ${r.name} (${r.role}) — ${r.pct}% (${r.present}/${r.total} days)`)
  return `Top ${limit} performers this month (${monthStart} to ${monthEnd}):\n${list.join('\n')}`
}

// ── Members below 75% attendance ─────────────────────────────────────────────
export async function getBelowThreshold(threshold = 75): Promise<string> {
  const now = new Date()
  const monthStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`
  const monthEnd   = today()

  const { data: entries } = await queryWithTimeout(
    db.from('attendance_entries').select('attendee_id, status').gte('date', monthStart).lte('date', monthEnd),
    'attendance_entries(below-threshold)'
  )

  const { data: allAttendees } = await queryWithTimeout(
    db.from('attendees').select('id, name, role').eq('status', 'active'),
    'attendees(below-threshold)'
  )

  if (!entries || !allAttendees) return 'Could not fetch data.'

  const totals: Record<string, { present: number; total: number; name: string; role: string }> = {}
  allAttendees.forEach((a: any) => { totals[a.id] = { present: 0, total: 0, name: a.name, role: a.role } })
  entries.forEach((e: any) => {
    if (!totals[e.attendee_id]) return
    totals[e.attendee_id].total++
    if (e.status === 'present' || e.status === 'late') totals[e.attendee_id].present++
  })

  const below = Object.values(totals)
    .filter(t => t.total > 0)
    .map(t => ({ ...t, pct: Math.round((t.present / t.total) * 100) }))
    .filter(t => t.pct < threshold)
    .sort((a, b) => a.pct - b.pct)

  if (below.length === 0) return `All team members are above ${threshold}% attendance this month. 🎉`

  const list = below.map(r => `• ${r.name} (${r.role}) — ${r.pct}% (${r.present}/${r.total} days)`)
  return `Members below ${threshold}% attendance this month:\n${list.join('\n')}`
}

// ── Attendance trend (last N days) ───────────────────────────────────────────
export async function getAttendanceTrend(days = 7): Promise<string> {
  const end   = new Date()
  const start = new Date(); start.setDate(start.getDate() - days + 1)
  const startStr = start.toISOString().split('T')[0]
  const endStr   = end.toISOString().split('T')[0]

  const { data: entries } = await queryWithTimeout(
    db.from('attendance_entries').select('date, status').gte('date', startStr).lte('date', endStr).order('date', { ascending: true }),
    'attendance_entries(trend)'
  )

  const { data: allAttendees } = await queryWithTimeout(
    db.from('attendees').select('id').eq('status', 'active'),
    'attendees(trend)'
  )

  if (!entries) return 'Could not fetch trend data.'

  const total = allAttendees?.length ?? 1
  const byDate: Record<string, { present: number }> = {}
  entries.forEach((e: any) => {
    if (!byDate[e.date]) byDate[e.date] = { present: 0 }
    if (e.status === 'present' || e.status === 'late') byDate[e.date].present++
  })

  const lines = Object.entries(byDate).map(([date, v]) =>
    `• ${date}: ${v.present}/${total} present (${Math.round((v.present / total) * 100)}%)`
  )

  return lines.length === 0
    ? `No attendance data in the last ${days} days.`
    : `Attendance trend (last ${days} days):\n${lines.join('\n')}`
}

// ── Active blockers ───────────────────────────────────────────────────────────
export async function getActiveBlockers(): Promise<string> {
  const { data: blockers } = await queryWithTimeout(
    db.from('blockers').select('description, severity, status, reported_date, attendee_id').in('status', ['open', 'in_progress']).order('reported_date', { ascending: false }).limit(10),
    'blockers(active)'
  )

  if (!blockers || blockers.length === 0) return 'No active blockers at the moment. ✅'

  const { data: allAttendees } = await queryWithTimeout(
    db.from('attendees').select('id, name'),
    'attendees(blockers)'
  )
  const nameMap: Record<string, string> = {}
  ;(allAttendees || []).forEach((a: any) => { nameMap[a.id] = a.name })

  const list = blockers.map((b: any) =>
    `• [${b.severity.toUpperCase()}] ${b.description} — ${nameMap[b.attendee_id] ?? 'Unknown'} (${b.status}, reported ${b.reported_date})`
  )

  return `Active blockers (${blockers.length}):\n${list.join('\n')}`
}

// ── Team overview ─────────────────────────────────────────────────────────────
export async function getTeamOverview(): Promise<string> {
  const { data: attendees } = await queryWithTimeout(
    db.from('attendees').select('id, name, role, project, status'),
    'attendees(overview)'
  )

  if (!attendees) return 'Could not fetch team data.'

  const active   = attendees.filter((a: any) => a.status === 'active')
  const onLeave  = attendees.filter((a: any) => a.status === 'on_leave')
  const inactive = attendees.filter((a: any) => a.status === 'inactive')

  const byRole: Record<string, number> = {}
  active.forEach((a: any) => { byRole[a.role] = (byRole[a.role] ?? 0) + 1 })

  const roleStr = Object.entries(byRole).map(([r, c]) => `${r}: ${c}`).join(', ')

  return `Team Overview:
• Total members: ${attendees.length}
• Active: ${active.length} (${roleStr})
• On leave: ${onLeave.length}
• Inactive: ${inactive.length}`
}

// ── Upcoming leaves ───────────────────────────────────────────────────────────
export async function getUpcomingLeaves(days = 7): Promise<string> {
  const start = today()
  const end   = new Date(); end.setDate(end.getDate() + days)
  const endStr = end.toISOString().split('T')[0]

  const { data: leaves } = await queryWithTimeout(
    db.from('leaves').select('attendee_id, start_date, end_date, reason').gte('start_date', start).lte('start_date', endStr).order('start_date', { ascending: true }),
    'leaves(upcoming)'
  )

  if (!leaves || leaves.length === 0) return `No upcoming leaves in the next ${days} days.`

  const { data: allAttendees } = await queryWithTimeout(
    db.from('attendees').select('id, name, role'),
    'attendees(upcoming-leaves)'
  )
  const nameMap: Record<string, { name: string; role: string }> = {}
  ;(allAttendees || []).forEach((a: any) => { nameMap[a.id] = { name: a.name, role: a.role } })

  const list = leaves.map((l: any) => {
    const a = nameMap[l.attendee_id]
    return a ? `• ${a.name} (${a.role}) — ${l.start_date} to ${l.end_date}${l.reason ? `: ${l.reason}` : ''}` : null
  }).filter(Boolean)

  return `Upcoming leaves in the next ${days} days:\n${list.join('\n')}`
}

// ── Intent detection → fetch relevant DB context ─────────────────────────────
export type DbContext = { fetched: boolean; summary: string; hadIntent: boolean }

const DATA_INTENTS: Array<{ keywords: string[]; fn: () => Promise<string> }> = [
  { keywords: ['absent', 'who is out', 'not present', 'on leave today', 'on leave', 'missing today', 'leave today'], fn: getAbsentToday },
  { keywords: ['late today', 'late arrival', 'who came late', 'who was late'], fn: getLateToday },
  { keywords: ['attendance summary', 'today summary', 'how many present', 'attendance today', 'present today'], fn: getAttendanceSummaryToday },
  { keywords: ['top performer', 'best attendance', 'highest attendance'], fn: getTopPerformers },
  { keywords: ['below 75', 'low attendance', 'poor attendance', 'attendance below'], fn: getBelowThreshold },
  { keywords: ['trend', 'attendance trend', 'last week', 'last few days'], fn: getAttendanceTrend },
  { keywords: ['blocker', 'blocked', 'impediment'], fn: getActiveBlockers },
  { keywords: ['team overview', 'team size', 'how many members', 'team members'], fn: getTeamOverview },
  { keywords: ['upcoming leave', 'leave next', 'who is going on leave', 'leave this week'], fn: getUpcomingLeaves },
]

/** Pure keyword check — no DB calls, instant */
export function hasDataIntent(message: string): boolean {
  const lower = message.toLowerCase()
  return DATA_INTENTS.some(i => i.keywords.some(k => lower.includes(k)))
}

export async function resolveDbContext(message: string): Promise<DbContext> {
  const lower = message.toLowerCase()

  for (const intent of DATA_INTENTS) {
    if (intent.keywords.some(k => lower.includes(k))) {
      try {
        const summary = await intent.fn()
        return { fetched: true, hadIntent: true, summary }
      } catch (err) {
        console.error('[chatDataService] DB fetch failed:', err)
        return { fetched: false, hadIntent: true, summary: '' }
      }
    }
  }

  return { fetched: false, hadIntent: false, summary: '' }
}
