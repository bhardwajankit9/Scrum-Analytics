// ─── Domain Use Cases ─────────────────────────────────────────────────────────
// Business logic that is framework-agnostic.
// Each use case has one responsibility (SRP).
// Uses repository interfaces, never concrete implementations (DIP).

import type { AttendanceEntry } from '../entities'
import type { IAttendanceRepository } from '../repositories'

// ── Save Attendance Use Case ──────────────────────────────────────────────────
// Replaces an entire project×date batch atomically.

export class SaveAttendanceUseCase {
  constructor(private readonly repo: IAttendanceRepository) {}

  execute(entries: AttendanceEntry[]): void {
    this.repo.saveEntries(entries)
  }
}

// ── Add Manual Entry Use Case ─────────────────────────────────────────────────
// Upserts a single entry (e.g. PMO manual punch-in from Dashboard).

export class AddManualEntryUseCase {
  constructor(private readonly repo: IAttendanceRepository) {}

  execute(entry: AttendanceEntry): void {
    this.repo.addEntry(entry)
  }
}

// ── Compute Late Use Case (pure function, no side effects) ────────────────────

export function computeLateStatus(
  joinTime: string,
  scrumTime: string,
  graceMins: number,
): { status: 'present' | 'late'; minutesLate: number } {
  const [sh, sm] = scrumTime.split(':').map(Number)
  const [jh, jm] = joinTime.split(':').map(Number)
  const deadline  = sh * 60 + sm + graceMins
  const actual    = jh * 60 + jm
  const diff      = actual - deadline
  return diff > 0
    ? { status: 'late', minutesLate: diff }
    : { status: 'present', minutesLate: 0 }
}

// ── Export CSV Use Case (Strategy Pattern) ────────────────────────────────────
// Callers supply a strategy object that knows how to format rows and name the file.
// Adding a new report type = new strategy class, no changes to use case (OCP).

export interface ICSVExportStrategy<T extends Record<string, string | number>> {
  format(data: unknown[]): T[]
  filename(from: string, to: string): string
}

export class ExportCSVUseCase {
  execute<T extends Record<string, string | number>>(
    strategy: ICSVExportStrategy<T>,
    data: unknown[],
    from: string,
    to: string,
  ): void {
    const rows = strategy.format(data)
    if (!rows.length) return
    const headers = Object.keys(rows[0])
    const csv = [
      headers.join(','),
      ...rows.map(r =>
        headers.map(h => `"${String(r[h]).replace(/"/g, '""')}"`).join(',')
      ),
    ].join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement('a')
    a.href = url
    a.download = strategy.filename(from, to)
    a.click()
    URL.revokeObjectURL(url)
  }
}

// ── toTime24 (pure helper, co-located here since it's a domain concern) ────────

export function toTime24(t: string | null): string | null {
  if (!t) return null
  if (/^\d{2}:\d{2}$/.test(t)) return t
  const [time, period] = t.split(' ')
  if (!period) return t
  const [h, m] = time.split(':').map(Number)
  if (period === 'PM' && h !== 12) return `${String(h + 12).padStart(2, '0')}:${String(m).padStart(2, '0')}`
  if (period === 'AM' && h === 12) return `00:${String(m).padStart(2, '0')}`
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
}
