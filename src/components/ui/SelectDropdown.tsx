// Shared SelectDropdown — modern custom dropdown replacing native <select>.
//
// Props:
//   value       — currently selected value ('' = nothing selected)
//   onChange    — callback with new value
//   options     — array of { value, label }
//   placeholder — shown when value is '' (default 'Select…')
//   allowClear  — show dark pill + X to reset (default false; set true for filter bars)
//   className   — applied to the wrapper div (e.g. 'w-full', 'min-w-[140px]')
//   disabled    — disables the button

import { useState, useRef, useEffect } from 'react'
import { ChevronDown, Check } from 'lucide-react'

export interface SelectOption {
  value: string
  label: string
}

interface SelectDropdownProps {
  value:       string
  onChange:    (v: string) => void
  options:     SelectOption[]
  placeholder?: string
  allowClear?:  boolean
  className?:   string
  disabled?:    boolean
}

export function SelectDropdown({
  value,
  onChange,
  options,
  placeholder = 'Select…',
  allowClear  = false,
  className   = '',
  disabled    = false,
}: SelectDropdownProps) {
  const [open,   setOpen]   = useState(false)
  const [popPos, setPopPos] = useState({ top: 0, left: 0, width: 0 })
  const trigRef  = useRef<HTMLButtonElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)

  // Close on outside click
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node) &&
          trigRef.current  && !trigRef.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  function handleOpen() {
    if (disabled) return
    if (trigRef.current) {
      const r = trigRef.current.getBoundingClientRect()
      setPopPos({ top: r.bottom + 6, left: r.left, width: Math.max(r.width, 180) })
    }
    setOpen(o => !o)
  }

  const selected = options.find(o => o.value === value)
  const isActive = allowClear && value !== '' && value !== undefined

  return (
    <div className={`relative ${className}`}>
      <button
        ref={trigRef}
        type="button"
        disabled={disabled}
        onClick={handleOpen}
        className={`w-full flex items-center justify-between gap-2 h-10 pl-3.5 pr-3 rounded-xl border text-sm font-medium transition-all shadow-sm whitespace-nowrap
          ${disabled
            ? 'opacity-50 cursor-not-allowed bg-gray-50 border-gray-200 text-gray-400'
            : isActive
            ? 'bg-gray-900 border-gray-900 text-white hover:bg-gray-800'
            : 'bg-white border-gray-200 text-gray-600 hover:border-gray-400 hover:text-gray-900'}`}
      >
        <span className="truncate text-left flex-1">
          {selected?.label ?? <span className="text-gray-400">{placeholder}</span>}
        </span>
        {isActive ? (
          <span
            onClick={e => { e.stopPropagation(); onChange('') }}
            className="shrink-0 text-[10px] font-bold bg-white/20 hover:bg-white/30 rounded-md px-1.5 py-0.5 cursor-pointer leading-none"
            title="Clear"
          >✕</span>
        ) : (
          <ChevronDown className={`w-3.5 h-3.5 shrink-0 transition-transform text-gray-400 ${open ? 'rotate-180' : ''}`} />
        )}
      </button>

      {open && !disabled && (
        <div
          ref={panelRef}
          style={{ position: 'fixed', top: popPos.top, left: popPos.left, minWidth: popPos.width }}
          className="z-[9999] bg-white rounded-2xl shadow-2xl border border-gray-100 py-1.5 max-h-60 overflow-y-auto"
        >
          {options.map(opt => (
            <button
              key={opt.value}
              type="button"
              onClick={() => { onChange(opt.value); setOpen(false) }}
              className={`w-full flex items-center justify-between px-4 py-2.5 text-sm transition-colors hover:bg-gray-50 text-left
                ${value === opt.value ? 'text-gray-900 font-semibold' : 'text-gray-600'}`}
            >
              <span>{opt.label}</span>
              {value === opt.value && <Check className="w-3.5 h-3.5 text-gray-900 shrink-0 ml-3" />}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
