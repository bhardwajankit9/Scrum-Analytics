// ─── Skeleton / Shimmer Components ───────────────────────────────────────────
// Reusable animated shimmer placeholders for loading states.

import React from 'react'

// ── Base shimmer bar ──────────────────────────────────────────────────────────
interface SkeletonLineProps {
  width?: string
  height?: string
  className?: string
  rounded?: string
}

export function SkeletonLine({
  width = 'w-full',
  height = 'h-4',
  className = '',
  rounded = 'rounded-md',
}: SkeletonLineProps) {
  return (
    <div
      className={`animate-pulse bg-gradient-to-r from-gray-100 via-gray-200 to-gray-100 bg-[length:200%_100%] ${height} ${width} ${rounded} ${className}`}
      style={{ backgroundSize: '200% 100%', animation: 'shimmer 1.6s infinite linear' }}
    />
  )
}

// ── Metric/Stat card skeleton ─────────────────────────────────────────────────
export function SkeletonMetricCard() {
  return (
    <div className="bg-white rounded-xl p-5 border border-gray-100 shadow-sm">
      <div className="flex items-start justify-between mb-3">
        <div className="w-9 h-9 rounded-lg bg-gray-100 animate-pulse" />
        <div className="w-12 h-4 rounded-md bg-gray-100 animate-pulse" />
      </div>
      <SkeletonLine width="w-24" height="h-3" className="mb-2" />
      <SkeletonLine width="w-16" height="h-7" />
    </div>
  )
}

// ── Table skeleton ─────────────────────────────────────────────────────────────
interface SkeletonTableProps {
  rows?: number
  cols?: number
}

export function SkeletonTableRows({ rows = 5, cols = 5 }: SkeletonTableProps) {
  return (
    <>
      {Array.from({ length: rows }).map((_, ri) => (
        <tr key={ri} className="border-b border-gray-50">
          {/* First col: avatar + two lines */}
          <td className="px-5 py-3.5">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-gray-100 animate-pulse shrink-0" />
              <div className="space-y-1.5 flex-1">
                <SkeletonLine width="w-28" height="h-3.5" />
                <SkeletonLine width="w-20" height="h-3" />
              </div>
            </div>
          </td>
          {/* Remaining cols */}
          {Array.from({ length: cols - 1 }).map((_, ci) => (
            <td key={ci} className="px-5 py-3.5">
              <SkeletonLine width={ci % 2 === 0 ? 'w-20' : 'w-16'} height="h-3.5" />
            </td>
          ))}
        </tr>
      ))}
    </>
  )
}

// ── Project card skeleton ──────────────────────────────────────────────────────
export function SkeletonProjectCard() {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-3">
      <div className="flex items-start justify-between">
        <div className="w-10 h-10 rounded-xl bg-gray-100 animate-pulse" />
        <div className="w-16 h-6 rounded-full bg-gray-100 animate-pulse" />
      </div>
      <SkeletonLine width="w-36" height="h-5" />
      <SkeletonLine width="w-48" height="h-3.5" />
      <div className="flex gap-4 pt-1">
        <SkeletonLine width="w-16" height="h-3" />
        <SkeletonLine width="w-16" height="h-3" />
      </div>
    </div>
  )
}

// ── Global shimmer keyframe injected once ─────────────────────────────────────
// Injects a <style> tag once for the shimmer keyframe animation.
let injected = false
export function ShimmerStyle() {
  if (injected) return null
  injected = true
  return (
    <style>{`
      @keyframes shimmer {
        0%   { background-position: 200% 0 }
        100% { background-position: -200% 0 }
      }
    `}</style>
  )
}
