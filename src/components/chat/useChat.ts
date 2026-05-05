import { useState, useCallback, useRef } from 'react'
import { supabase } from '../../lib/supabase/client'
import type { ChatMessage } from './types'
import { resolveDbContext, hasDataIntent, debugDbConnection } from './chatDataService'

function uid() { return Math.random().toString(36).slice(2, 10) }

// ── Groq config ───────────────────────────────────────────────────────────────
const GROQ_MODEL   = 'llama-3.3-70b-versatile'
const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions'

const SYSTEM_PROMPT =
  'You are a helpful Scrum and Agile assistant embedded in a team management app. ' +
  'You have direct access to live team attendance, leave, and project data from the database. ' +
  'When team data is provided at the start of the user message (prefixed with "--- LIVE TEAM DATA ---"), use it to answer accurately. ' +
  'If the data section says "Could not fetch", tell the user the database is temporarily unavailable and to try again. ' +
  'Format responses with bullet points. Never invent names, numbers, or attendance figures.'

// ── Timeout helper — ensures DB fetch never hangs chat ─────────────────────
function withTimeout<T>(promise: Promise<T>, ms: number, fallback: T): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>(resolve => setTimeout(() => resolve(fallback), ms)),
  ])
}

// ── Groq streaming ────────────────────────────────────────────────────────────
async function* streamGroq(
  apiKey: string,
  history: { role: string; content: string }[],
): AsyncGenerator<string> {
  const messages = [
    { role: 'system', content: SYSTEM_PROMPT },
    ...history
      .filter(m => m.role !== 'system')
      .map(m => ({ role: m.role === 'assistant' ? 'assistant' : 'user', content: m.content })),
  ]

  const res = await fetch(GROQ_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: GROQ_MODEL,
      messages,
      temperature: 0.7,
      max_tokens: 1024,
      stream: true,
    }),
  })

  if (!res.ok) {
    const errText = await res.text()
    if (res.status === 429) throw new Error('RATE_LIMITED')
    throw new Error(`Groq error ${res.status}: ${errText}`)
  }

  const reader  = res.body!.getReader()
  const decoder = new TextDecoder()
  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    const chunk = decoder.decode(value, { stream: true })
    for (const line of chunk.split('\n')) {
      const trimmed = line.trim()
      if (!trimmed.startsWith('data:')) continue
      const data = trimmed.slice(5).trim()
      if (!data || data === '[DONE]') continue
      try {
        const parsed = JSON.parse(data)
        const token: string = parsed?.choices?.[0]?.delta?.content ?? ''
        if (token) yield token
      } catch { /* skip malformed chunks */ }
    }
  }
}

// ── Supabase persistence helpers ──────────────────────────────────────────────
async function createConversation(title: string): Promise<string | null> {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase as any)
      .from('chat_conversations')
      .insert({ title })
      .select('id')
      .single()
    if (error) return null
    return data?.id ?? null
  } catch { return null }
}

async function loadConversationMessages(conversationId: string): Promise<ChatMessage[]> {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase as any)
      .from('chat_messages')
      .select('id, role, content, created_at')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true })
    if (error || !data) return []
    return data.map((row: { id: string; role: string; content: string; created_at: string }) => ({
      id: row.id,
      role: row.role as ChatMessage['role'],
      content: row.content,
      createdAt: new Date(row.created_at),
    }))
  } catch { return [] }
}

// ── Mock fallback (no API key configured) ────────────────────────────────────
const MOCK: Record<string, string> = {
  absent:             "Based on today's attendance data, the following members are on leave:\n\n• **Alice Johnson** — No check-in recorded\n• **Bob Smith** — On approved leave\n• **Carol White** — On leave without notification\n\nTotal on leave: 3 out of 12 team members.",
  'attendance summary': "📊 **Attendance Summary — This Week**\n\nPresent: 9 members (75%)\nLate: 2 members (17%)\nOn Leave: 1 member (8%)\n\nOverall this week's attendance rate: **84.6%**",
  'top performer':    "🏆 **Top Performers — This Month**\n\n1. **David Lee** — 100% attendance\n2. **Emma Davis** — 98% attendance\n3. **Frank Wilson** — 96% attendance\n\nKeep up the great work! 🎉",
  trend:              "📅 **Attendance Trend — Last 4 Weeks**\n\nWeek 1: 91% \u25b2\nWeek 2: 88% \u25bc\nWeek 3: 85% \u25bc\nWeek 4: 90% \u25b2\n\nAverage: **88.5%** — slightly below the 90% target.",
  'below 75':         "\u26a0\ufe0f **Members Below 75% Attendance**\n\n• **Carol White** — 68%\n• **Mike Brown** — 71%\n• **Sara Kim** — 73%\n\nPlease follow up with these team members.",
}

function getMockResponse(msg: string): string {
  const lower = msg.toLowerCase()
  const key   = Object.keys(MOCK).find(k => lower.includes(k))
  return key ? MOCK[key] : `You asked: "${msg}"\n\nI'm running in demo mode. Add VITE_GROQ_API_KEY in .env.local to get real AI answers.`
}

async function* mockStream(text: string): AsyncGenerator<string> {
  for (const word of text.split(' ')) {
    yield word + ' '
    await new Promise(r => setTimeout(r, 35))
  }
}

// ── Hook ──────────────────────────────────────────────────────────────────────
export function useChat(initialConversationId?: string) {
  const [messages, setMessages]     = useState<ChatMessage[]>([])
  const [loading, setLoading]       = useState(false)
  const [error, setError]           = useState<string | null>(null)
  const [conversationId, setConvId] = useState<string | null>(initialConversationId ?? null)
  const abortRef                    = useRef<AbortController | null>(null)

  const updateLast = useCallback((patch: Partial<ChatMessage>) => {
    setMessages(prev => {
      const copy = [...prev]
      const idx  = copy.findLastIndex(m => m.role === 'assistant')
      if (idx === -1) return prev
      copy[idx] = { ...copy[idx], ...patch }
      return copy
    })
  }, [])

  const loadConversation = useCallback(async (id: string) => {
    setConvId(id)
    const msgs = await loadConversationMessages(id)
    setMessages(msgs)
  }, [])

  const sendMessage = useCallback(async (content: string) => {
    const text = content.trim()
    if (!text || loading) return
    setError(null)

    const userMsg: ChatMessage      = { id: uid(), role: 'user',      content: text, createdAt: new Date() }
    const assistantMsg: ChatMessage = { id: uid(), role: 'assistant', content: '',   streaming: true, createdAt: new Date() }

    setMessages(prev => [...prev, userMsg, assistantMsg])
    setLoading(true)
    abortRef.current = new AbortController()

    try {
      const groqKey = import.meta.env.VITE_GROQ_API_KEY as string | undefined

      const history = messages
        .filter(m => m.content.length > 0 && !m.streaming)
        .map(m => ({ role: m.role, content: m.content }))
      history.push({ role: 'user', content: text })

      // ── Debug command: type "debug db" to test Supabase connection ──────
      if (text.toLowerCase() === 'debug db') {
        const report = await debugDbConnection()
        updateLast({ content: report })
        return
      }

      if (groqKey) {
        if (!conversationId) {
          createConversation(text.slice(0, 60)).then(id => { if (id) setConvId(id) })
        }

        // 1. Check intent instantly (no DB call) to know if this is a data question
        const isDataQuestion = hasDataIntent(text)

        // 2. If it's a data question, fetch from Supabase with 10s timeout
        let dbSummary: string | null = null
        if (isDataQuestion) {
          try {
            const dbCtx = await withTimeout(
              resolveDbContext(text),
              10000,
              { fetched: false, hadIntent: true, summary: '' },
            )
            dbSummary = dbCtx.fetched ? dbCtx.summary : null
            console.log('[chat] DB fetched:', dbCtx.fetched, '| summary length:', dbCtx.summary?.length)
          } catch (err) {
            console.error('[chat] DB error:', err)
          }
        }

        // 3. Build history — inject DB data if available, or a clear error if DB failed
        let historyWithCtx: { role: string; content: string }[]
        if (isDataQuestion && dbSummary) {
          historyWithCtx = [
            ...history.slice(0, -1),
            {
              role: 'user' as const,
              content: `--- LIVE TEAM DATA ---\n${dbSummary}\n--- END DATA ---\n\n${text}`,
            },
          ]
        } else if (isDataQuestion && !dbSummary) {
          historyWithCtx = [
            ...history.slice(0, -1),
            {
              role: 'user' as const,
              content: `--- LIVE TEAM DATA ---\nCould not fetch data from the database right now.\n--- END DATA ---\n\n${text}`,
            },
          ]
        } else {
          historyWithCtx = history
        }

        try {
          let acc = ''
          for await (const token of streamGroq(groqKey, historyWithCtx)) {
            if (abortRef.current?.signal.aborted) break
            acc += token
            updateLast({ content: acc })
          }
        } catch (e) {
          const msg = e instanceof Error ? e.message : ''
          if (msg === 'RATE_LIMITED') {
            console.warn('Groq rate limited, using mock responses')
            const response = getMockResponse(text)
            let acc = ''
            for await (const chunk of mockStream(response)) {
              acc += chunk
              updateLast({ content: acc })
            }
          } else {
            throw e
          }
        }
      } else {
        const response = getMockResponse(text)
        let acc = ''
        for await (const chunk of mockStream(response)) {
          if (abortRef.current?.signal.aborted) break
          acc += chunk
          updateLast({ content: acc })
        }
      }
    } catch (e: unknown) {
      if ((e as { name?: string })?.name === 'AbortError') {
        updateLast({ content: '_(cancelled)_' })
      } else {
        const msg = e instanceof Error ? e.message : 'Something went wrong.'
        setError(msg)
        updateLast({ content: `⚠️ ${msg}` })
      }
    } finally {
      updateLast({ streaming: false })
      setLoading(false)
      abortRef.current = null
    }
  }, [loading, messages, conversationId, updateLast])

  const stopStreaming = useCallback(() => { abortRef.current?.abort() }, [])

  const clearChat = useCallback(() => {
    abortRef.current?.abort()
    setMessages([])
    setError(null)
    setLoading(false)
    setConvId(null)
  }, [])

  return { messages, loading, error, conversationId, sendMessage, stopStreaming, clearChat, loadConversation }
}
