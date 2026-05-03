import type { PublicHoliday } from '../../domain/entities'

export class PublicHolidayRepository {
  private holidays: PublicHoliday[] = [
    {
      id: '1',
      name: 'Labour Day',
      date: '2026-05-01',
      country: 'IN',
      created_at: new Date().toISOString(),
    },
    {
      id: '2',
      name: 'Independence Day',
      date: '2026-08-15',
      country: 'IN',
      created_at: new Date().toISOString(),
    },
    {
      id: '3',
      name: 'Republic Day',
      date: '2026-01-26',
      country: 'IN',
      created_at: new Date().toISOString(),
    },
    {
      id: '4',
      name: 'Diwali',
      date: '2026-10-29',
      country: 'IN',
      created_at: new Date().toISOString(),
    },
  ]

  get all(): PublicHoliday[] {
    return [...this.holidays]
  }

  addHoliday(holiday: PublicHoliday): void {
    this.holidays.push(holiday)
  }

  removeHoliday(id: string): void {
    this.holidays = this.holidays.filter(h => h.id !== id)
  }

  updateHoliday(id: string, data: Partial<PublicHoliday>): void {
    const idx = this.holidays.findIndex(h => h.id === id)
    if (idx !== -1) {
      this.holidays[idx] = { ...this.holidays[idx], ...data }
    }
  }

  isHoliday(date: string): PublicHoliday | undefined {
    return this.holidays.find(h => h.date === date)
  }

  isWeekend(date: string): boolean {
    const d = new Date(date + 'T00:00:00')
    const day = d.getDay()
    return day === 0 || day === 6 // 0 = Sunday, 6 = Saturday
  }

  getWeekendName(date: string): string {
    const d = new Date(date + 'T00:00:00')
    const day = d.getDay()
    return day === 0 ? 'Sunday' : day === 6 ? 'Saturday' : ''
  }
}
