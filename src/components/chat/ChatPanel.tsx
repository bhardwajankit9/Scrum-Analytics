import { useEffect, useRef, useState, type KeyboardEvent } from 'react'
import { X, Send, Square, Trash2, Bot, Sparkles } from 'lucide-react'
import { useChat } from './useChat'
import type { ChatMessage } from './types'

// ── Suggested prompts ─────────────────────────────────────────────────────────
const PROMPTS = [
  '👤 Who is on leave today?',
  '📊 Show attendance summary',
  '🏆 Top performers',
  '⚠️ Members below 75%',
  '📅 Attendance trends',
]

// ── Typing indicator ──────────────────────────────────────────────────────────
function TypingDots() {
  return (
    <div className="flex items-end gap-2">
      <div className="w-7 h-7 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white text-xs font-bold shrink-0">
        AI
      </div>
      <div className="bg-white border border-gray-100 rounded-2xl rounded-bl-sm px-3 py-2.5 shadow-sm">
        <div className="flex gap-1 items-center h-3.5">
          {[0, 150, 300].map(delay => (
            <span
              key={delay}
              className="w-1.5 h-1.5 rounded-full bg-gray-400 animate-bounce"
              style={{ animationDelay: `${delay}ms` }}
            />
          ))}
        </div>
      </div>
    </div>
  )
}

// ── Single message bubble ─────────────────────────────────────────────────────
function Bubble({ msg }: { msg: ChatMessage }) {
  const isUser = msg.role === 'user'
  return (
    <div className={`flex items-end gap-2 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}>
      {!isUser && (
        <div className="w-7 h-7 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white text-xs font-bold shrink-0">
          AI
        </div>
      )}
      <div
        className={`max-w-[80%] px-3 py-2.5 rounded-2xl text-sm leading-relaxed shadow-sm
          ${isUser
            ? 'bg-indigo-600 text-white rounded-br-sm'
            : 'bg-white text-gray-800 border border-gray-100 rounded-bl-sm'}`}
      >
        <span className="whitespace-pre-wrap break-words">{msg.content}</span>
        {msg.streaming && (
          <span className="inline-block w-0.5 h-3.5 ml-0.5 bg-current align-middle animate-pulse" />
        )}
      </div>
    </div>
  )
}

// ── Auto-resize input ─────────────────────────────────────────────────────────
function ChatInput({ onSend, onStop, loading }: {
  onSend: (v: string) => void
  onStop: () => void
  loading: boolean
}) {
  const [value, setValue] = useState('')
  const ref = useRef<HTMLTextAreaElement>(null)

  function send() {
    if (!value.trim()) return
    onSend(value.trim())
    setValue('')
    if (ref.current) ref.current.style.height = 'auto'
  }

  function onKey(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() }
  }

  function onInput() {
    if (!ref.current) return
    ref.current.style.height = 'auto'
    ref.current.style.height = `${Math.min(ref.current.scrollHeight, 120)}px`
  }

  return (
    <div className="border-t border-gray-100 bg-white px-3 py-2.5">
      <div className="flex items-end gap-2 bg-gray-50 border border-gray-200 rounded-xl px-3 py-1.5 focus-within:border-indigo-400 transition-colors">
        <textarea
          ref={ref}
          rows={1}
          value={value}
          onChange={e => setValue(e.target.value)}
          onKeyDown={onKey}
          onInput={onInput}
          placeholder="Ask about attendance…"
          className="flex-1 resize-none bg-transparent text-sm text-gray-800 placeholder-gray-400 outline-none leading-relaxed py-1 max-h-28"
        />
        {loading ? (
          <button onClick={onStop} title="Stop"
            className="mb-1 w-7 h-7 flex items-center justify-center rounded-lg bg-red-500 hover:bg-red-600 text-white transition-colors shrink-0">
            <Square className="w-3 h-3" fill="currentColor" />
          </button>
        ) : (
          <button onClick={send} disabled={!value.trim()} title="Send"
            className="mb-1 w-7 h-7 flex items-center justify-center rounded-lg bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-200 disabled:cursor-not-allowed text-white transition-colors shrink-0">
            <Send className="w-3 h-3" />
          </button>
        )}
      </div>
      <p className="text-center text-[10px] text-gray-400 mt-1.5 select-none">
        Enter to send · Shift+Enter for new line
      </p>
    </div>
  )
}

// ── ChatPanel (slide-in drawer) ───────────────────────────────────────────────
interface Props {
  open: boolean
  onClose: () => void
}

export function ChatPanel({ open, onClose }: Props) {
  const { messages, loading, error, sendMessage, stopStreaming, clearChat } = useChat()
  const bottomRef = useRef<HTMLDivElement>(null)

  // Auto-scroll
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  // Close on Escape
  useEffect(() => {
    function onKey(e: globalThis.KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    if (open) document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open, onClose])

  return (
    <>
      {/* Backdrop (mobile) */}
      {open && (
        <div
          className="fixed inset-0 z-40 bg-black/30 backdrop-blur-sm md:hidden"
          onClick={onClose}
        />
      )}

      {/* Drawer */}
      <div
        className={`
          fixed bottom-0 right-0 z-50 flex flex-col
          w-full md:w-[400px] h-[85vh] md:h-[600px] md:bottom-20 md:right-5
          bg-gray-50 border border-gray-200 md:rounded-2xl shadow-2xl
          transition-all duration-300 ease-in-out
          ${open ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0 pointer-events-none'}
        `}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 bg-white border-b border-gray-100 md:rounded-t-2xl shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow">
              <Bot className="w-4 h-4 text-white" />
            </div>
            <div>
              <p className="text-sm font-semibold leading-none text-gray-900">AI Assistant</p>
              <p className="text-[11px] text-gray-400 mt-0.5">
                {loading
                  ? <span className="text-green-500 flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse inline-block" />Generating…</span>
                  : 'Ask about your team'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            {messages.length > 0 && (
              <button onClick={clearChat} title="Clear chat"
                className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors">
                <Trash2 className="w-4 h-4" />
              </button>
            )}
            <button onClick={onClose} title="Close"
              className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Error banner */}
        {error && (
          <div className="px-4 py-2 bg-red-50 border-b border-red-100 text-xs text-red-600 shrink-0">
            ⚠️ {error}
          </div>
        )}

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
          {messages.length === 0 && (
            <div className="flex flex-col items-center justify-center h-full text-center gap-3 text-gray-400 select-none">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg">
                <Sparkles className="w-5 h-5 text-white" />
              </div>
              <p className="text-sm font-medium text-gray-600">How can I help you today?</p>
              <p className="text-xs">Ask me anything about your team's attendance.</p>
            </div>
          )}

          {messages.map(msg => <Bubble key={msg.id} msg={msg} />)}

          {loading && !messages.at(-1)?.streaming && <TypingDots />}

          <div ref={bottomRef} />
        </div>

        {/* Suggested prompts — only when empty */}
        {messages.length === 0 && (
          <div className="px-4 pb-2 shrink-0">
            <p className="text-[10px] uppercase tracking-wide text-gray-400 font-medium mb-1.5">Suggested</p>
            <div className="flex flex-wrap gap-1.5">
              {PROMPTS.map(p => (
                <button
                  key={p}
                  disabled={loading}
                  onClick={() => sendMessage(p.replace(/^[\p{Emoji}\s]+/u, '').trim())}
                  className="text-[11px] px-2.5 py-1 rounded-full border border-gray-200 bg-white text-gray-600 hover:border-indigo-400 hover:text-indigo-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  {p}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Input */}
        <ChatInput onSend={sendMessage} onStop={stopStreaming} loading={loading} />
      </div>
    </>
  )
}
