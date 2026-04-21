import { useState, useCallback } from 'react'
import type { IHolidayRepository } from '../../domain/repositories'
import type { Holiday } from '../../domain/entities'
import { SEED_HOLIDAYS } from '../seeds'

export function useHolidayRepository(): IHolidayRepository {
  const [all, setAll] = useState<Holiday[]>(SEED_HOLIDAYS)

  const add = useCallback((h: Omit<Holiday, 'id'>): Holiday => {
    const item: Holiday = { ...h, id: `h${Date.now()}` }
    setAll(prev => [...prev, item])
    return item
  }, [])

  const remove = useCallback((id: string) => {
    setAll(prev => prev.filter(h => h.id !== id))
  }, [])

  return { all, add, remove }
}
