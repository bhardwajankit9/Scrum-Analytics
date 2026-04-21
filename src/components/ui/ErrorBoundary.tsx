// ─── Section Error Boundary ───────────────────────────────────────────────────
// Wraps a UI section so a runtime error in that section only blanks that section
// instead of crashing the whole page.
//
// Usage:
//   <SectionErrorBoundary label="Action Required">
//     <ActionRequiredPanel />
//   </SectionErrorBoundary>

import { Component, type ReactNode, type ErrorInfo } from 'react'

interface Props {
  children:    ReactNode
  label?:      string   // shown in the fallback tile for debugging
  fallback?:   ReactNode
  className?:  string
}

interface State { hasError: boolean }

export class SectionErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(): State { return { hasError: true } }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.warn(`[SectionErrorBoundary] "${this.props.label ?? 'section'}" crashed:`, error.message, info.componentStack?.slice(0, 200))
  }

  render() {
    if (!this.state.hasError) return this.props.children

    if (this.props.fallback) return this.props.fallback

    return (
      <div className={`flex flex-col items-center justify-center gap-2 py-8 px-4 text-center ${this.props.className ?? ''}`}>
        <span className="text-2xl">⚠️</span>
        <p className="text-xs font-semibold text-gray-400">
          {this.props.label ? `"${this.props.label}" failed to load` : 'This section failed to load'}
        </p>
        <button
          onClick={() => this.setState({ hasError: false })}
          className="mt-1 text-[11px] text-blue-500 hover:underline"
        >
          Retry
        </button>
      </div>
    )
  }
}
