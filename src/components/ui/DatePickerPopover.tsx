// Shared DatePickerPopover — same look as the Dashboard calendar filter.
// Props:
//   value       — ISO date string (YYYY-MM-DD) or ''
//   onChange    — callback with new ISO date string
//   fullWidth   — makes the trigger button take full width (for form grids)
//   placeholder — text shown when value is empty (default 'Pick a date')

import { useState, useRef, useEffect } from 'react'
import { Calendar, ChevronLeft, ChevronRight } from 'lucide-react'

const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December']
const DAYS   = ['Su','Mo','Tu','We','Th','Fr','Sa']

interface DatePickerPopoverProps {
  value:       string
  onChange:    (v: string) => void
  fullWidth?:  boolean
  placeholder?: string
}

export function DatePickerPopover({ value, onChange, fullWidth = false, placeholder = 'Pick a date' }: DatePickerPopoverProps) {
  const today    = new Date().toISOString().slice(0, 10)
  const selected = value ? new Date(value + 'T00:00:00') : new Date()

  const [open,   setOpen]   = useState(false)
  const [view,   setView]   = useState({ year: selected.getFullYear(), month: selected.getMonth() })
  const [popPos, setPopPos] = useState({ top: 0, left: 0 })
  const ref     = useRef<HTMLDivElement>(null)
  const trigRef = useRef<HTMLButtonElement>(null)

  // Close on outside click
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current     && !ref.current.contains(e.target as Node) &&
          trigRef.current && !trigRef.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  // Sync view month when value changes externally
  useEffect(() => {
    if (value) {
      const d = new Date(value + 'T00:00:00')
      setView({ year: d.getFullYear(), month: d.getMonth() })
    }
  }, [value])

  function handleOpen() {
    if (trigRef.current) {
      const r = trigRef.current.getBoundingClientRect()
      setPopPos({ top: r.bottom + 8, left: r.left })
    }
    setOpen(o => !o)
  }

  const isToday = value === today
  const label   = value
    ? new Date(value + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
    : placeholder

  // Calendar grid
  const firstDay    = new Date(view.year, view.month, 1).getDay()
  const daysInMonth = new Date(view.year, view.month + 1, 0).getDate()
  const cells: (number | null)[] = [
    ...Array(firstDay).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ]
  while (cells.length % 7 !== 0) cells.push(null)

  function selectDay(day: number) {
    const d = `${view.year}-${String(view.month + 1).padStart(2,'0')}-${String(day).padStart(2,'0')}`
    onChange(d)
    setOpen(false)
  }
  function prevMonth() {
    setView(v => v.month === 0 ? { year: v.year - 1, month: 11 } : { ...v, month: v.month - 1 })
  }
  function nextMonth() {
    setView(v => v.month === 11 ? { year: v.year + 1, month: 0 } : { ...v, month: v.month + 1 })
  }

  const todayDate = new Date()
  function isSelected(day: number) {
    return value === `${view.year}-${String(view.month + 1).padStart(2,'0')}-${String(day).padStart(2,'0')}`
  }
  function isCurrentDay(day: number) {
    return todayDate.getFullYear() === view.year &&
           todayDate.getMonth()    === view.month &&
           todayDate.getDate()     === day
  }

  return (
    <div className={`relative ${fullWidth ? 'w-full' : ''}`}>
      {/* Trigger */}
      <button
        ref={trigRef}
        type="button"
        onClick={handleOpen}
        className={`flex items-center gap-2.5 h-10 pl-3.5 pr-4 rounded-xl border text-sm font-medium transition-all shadow-sm
          ${fullWidth ? 'w-full justify-between' : ''}
          ${!isToday && value
            ? 'bg-gray-900 border-gray-900 text-white hover:bg-gray-800'
            : 'bg-white border-gray-200 text-gray-700 hover:border-gray-400 hover:shadow'}`}
      >
        <span className="flex items-center gap-2">
          <Calendar className="w-3.5 h-3.5 shrink-0" />
          <span>{label}</span>
        </span>
        {!isToday && value && (
          <span
            onClick={e => { e.stopPropagation(); onChange(today) }}
            className="ml-0.5 text-[10px] font-bold bg-white/20 hover:bg-white/30 rounded-md px-1.5 py-0.5 cursor-pointer"
            title="Reset to today"
          >✕</span>
        )}
      </button>

      {/* Popover — fixed so it escapes overflow:hidden ancestors */}
      {open && (
        <div
          ref={ref}
          style={{ position: 'fixed', top: popPos.top, left: popPos.left }}
          className="z-[9999] w-72 bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden"
        >
          {/* Month nav */}
          <div className="flex items-center justify-between px-4 py-3 bg-gray-900 text-white">
            <button onClick={prevMonth} className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-white/10 transition-colors">
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-sm font-semibold">{MONTHS[view.month]} {view.year}</span>
            <button onClick={nextMonth} className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-white/10 transition-colors">
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* Day headers */}
          <div className="grid grid-cols-7 px-3 pt-3 pb-1">
            {DAYS.map(d => (
              <div key={d} className="text-center text-[10px] font-bold text-gray-400 uppercase pb-1">{d}</div>
            ))}
          </div>

          {/* Date grid */}
          <div className="grid grid-cols-7 gap-y-0.5 px-3 pb-3">
            {cells.map((day, i) => (
              <div key={i} className="flex items-center justify-center">
                {day ? (
                  <button
                    type="button"
                    onClick={() => selectDay(day)}
                    className={`w-8 h-8 rounded-full text-sm font-medium transition-all
                      ${isSelected(day)
                        ? 'bg-gray-900 text-white shadow-sm'
                        : isCurrentDay(day)
                        ? 'bg-gray-100 text-gray-900 font-bold ring-1 ring-gray-300'
                        : 'text-gray-700 hover:bg-gray-100'}`}
                  >
                    {day}
                  </button>
                ) : <div />}
              </div>
            ))}
          </div>

          {/* Quick actions */}
          <div className="flex items-center gap-2 px-3 pb-3">
            <button
              type="button"
              onClick={() => { onChange(today); setOpen(false) }}
              className="flex-1 py-1.5 rounded-lg text-xs font-semibold bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors"
            >
              Today
            </button>
            <button
              type="button"
              onClick={() => {
                const y = new Date(); y.setDate(y.getDate() - 1)
                onChange(y.toISOString().slice(0, 10)); setOpen(false)
              }}
              className="flex-1 py-1.5 rounded-lg text-xs font-semibold bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors"
            >
              Yesterday
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
