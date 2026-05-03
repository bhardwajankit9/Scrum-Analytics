import { useState, useCallback, useRef } from 'react'
import { supabase } from '../../lib/supabase/client'
import type { ChatMessage } from './types'

function uid() { return Math.random().toString(36).slice(2, 10) }

// ── Edge Function URL (set VITE_SUPABASE_URL in .env.local) ───────────────────
function getEdgeFunctionUrl(): string | null {
  const base = import.meta.env.VITE_SUPABASE_URL as string | undefined
  if (!base) return null
  return `${base.replace(/\/$/, '')}/functions/v1/chat`
}

// ── Mistral API fallback (dev only — set VITE_MISTRAL_API_KEY in .env.local) ─
// Used when the Edge Function is not yet deployed so dev works immediately.
const MISTRAL_MODEL = 'mistral-small-latest'
const SYSTEM_PROMPT =
  'You are a helpful Scrum and Agile assistant embedded in a team management app. ' +
  'Answer questions about Scrum ceremonies, sprint planning, velocity, retrospectives, ' +
  'and team dynamics concisely and clearly.'

interface MistralMessage { role: 'user' | 'assistant'; content: string }

function toMistralMessages(msgs: { role: string; content: string }[]): MistralMessage[] {
  return msgs
    .filter(m => m.role !== 'system')
    .map(m => ({ role: (m.role === 'assistant' ? 'assistant' : 'user') as 'user' | 'assistant', content: m.content }))
}

async function* streamMistralDirect(
  apiKey: string,
  history: { role: string; content: string }[],
): AsyncGenerator<string> {
  const url = 'https://api.mistral.ai/v1/chat/completions'
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: MISTRAL_MODEL,
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        ...toMistralMessages(history),
      ],
      temperature: 0.7,
      max_tokens: 1024,
      stream: true,
    }),
  })
  if (!res.ok) {
    const text = await res.text()
    if (res.status === 429) {
      throw new Error(`RATE_LIMITED: Mistral quota exceeded. Using mock responses.`)
    }
    throw new Error(`Mistral error ${res.status}: ${text}`)
  }
  const reader  = res.body!.getReader()
  const decoder = new TextDecoder()
  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    const text = decoder.decode(value, { stream: true })
    for (const line of text.split('\n')) {
      const trimmed = line.trim()
      if (!trimmed.startsWith('data:')) continue
      const data = trimmed.slice(5).trim()
      if (!data || data === '[DONE]') continue
      try {
        const p = JSON.parse(data)
        const token: string = p?.choices?.[0]?.delta?.content ?? ''
        if (token) yield token
      } catch { /* skip */ }
    }
  }
}

// ── Supabase helpers ──────────────────────────────────────────────────────────

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
  } catch {
    return null
  }
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
  } catch {
    return []
  }
}

// ── Mock fallback ─────────────────────────────────────────────────────────────
const MOCK: Record<string, string> = {
  'absent': 'Based on today\'s attendance data, the following members are on leave:\n\n• **Alice Johnson** — No check-in recorded\n• **Bob Smith** — On approved leave\n• **Carol White** — On leave without notification\n\nTotal on leave: 3 out of 12 team members.',
  'attendance summary': '📊 **Attendance Summary — This Week**\n\nPresent: 9 members (75%)\nLate: 2 members (17%)\nOn Leave: 1 member (8%)\n\nOverall this week\'s attendance rate: **84.6%**',
  'top performer': '🏆 **Top Performers — This Month**\n\n1. **David Lee** — 100% attendance\n2. **Emma Davis** — 98% attendance\n3. **Frank Wilson** — 96% attendance\n\nKeep up the great work! 🎉',
  'trend': '📅 **Attendance Trend — Last 4 Weeks**\n\nWeek 1: 91% ▲\nWeek 2: 88% ▼\nWeek 3: 85% ▼\nWeek 4: 90% ▲\n\nAverage: **88.5%** — slightly below the 90% target.',
  'below 75': '⚠️ **Members Below 75% Attendance**\n\n• **Carol White** — 68%\n• **Mike Brown** — 71%\n• **Sara Kim** — 73%\n\nPlease follow up with these team members.',
}

function getMockResponse(msg: string): string {
  const lower = msg.toLowerCase()
  const key = Object.keys(MOCK).find(k => lower.includes(k))
  return key
    ? MOCK[key]
    : `You asked: "${msg}"\n\nI'm running in demo mode. Add VITE_SUPABASE_URL and deploy the chat Edge Function to get real Mistral answers.`
}

async function* mockStream(text: string): AsyncGenerator<string> {
  const words = text.split(' ')
  for (const word of words) {
    yield word + ' '
    await new Promise(r => setTimeout(r, 35))
  }
}

// ── Hook ──────────────────────────────────────────────────────────────────────

export function useChat(initialConversationId?: string) {
  const [messages, setMessages]         = useState<ChatMessage[]>([])
  const [loading, setLoading]           = useState(false)
  const [error, setError]               = useState<string | null>(null)
  const [conversationId, setConvId]     = useState<string | null>(initialConversationId ?? null)
  const abortRef                        = useRef<AbortController | null>(null)

  const updateLast = useCallback((patch: Partial<ChatMessage>) => {
    setMessages(prev => {
      const copy = [...prev]
      const idx  = copy.findLastIndex(m => m.role === 'assistant')
      if (idx === -1) return prev
      copy[idx] = { ...copy[idx], ...patch }
      return copy
    })
  }, [])

  /** Load an existing conversation from Supabase */
  const loadConversation = useCallback(async (id: string) => {
    setConvId(id)
    const msgs = await loadConversationMessages(id)
    setMessages(msgs)
  }, [])

  const sendMessage = useCallback(async (content: string) => {
    const text = content.trim()
    if (!text || loading) return
    setError(null)

    const userMsg: ChatMessage   = { id: uid(), role: 'user',      content: text,  createdAt: new Date() }
    const assistantMsg: ChatMessage = { id: uid(), role: 'assistant', content: '',    streaming: true, createdAt: new Date() }

    setMessages(prev => [...prev, userMsg, assistantMsg])
    setLoading(true)

    const edgeUrl = getEdgeFunctionUrl()

    try {
      if (edgeUrl) {
        // ── Supabase Edge Function → Mistral streaming ────────────────────
        abortRef.current = new AbortController()

        // Ensure we have a conversation row for persistence
        let convId = conversationId
        if (!convId) {
          convId = await createConversation(text.slice(0, 60))
          if (convId) setConvId(convId)
        }

        // Build history (exclude empty/streaming placeholders)
        const history = messages
          .filter(m => m.content.length > 0 && !m.streaming)
          .map(m => ({ role: m.role, content: m.content }))
        history.push({ role: 'user', content: text })

        // Get user JWT for RLS
        const { data: { session } } = await supabase.auth.getSession()
        const headers: Record<string, string> = {
          'Content-Type': 'application/json',
          'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY as string ?? '',
        }
        if (session?.access_token) headers['Authorization'] = `Bearer ${session.access_token}`

        const res = await fetch(edgeUrl, {
          method: 'POST',
          headers,
          body: JSON.stringify({ messages: history, conversation_id: convId }),
          signal: abortRef.current.signal,
        })
        
        // If Edge Function not deployed (404) or other error, fall back to direct Mistral
        if (!res.ok) {
          const mistralKey = import.meta.env.VITE_MISTRAL_API_KEY as string | undefined
          if (mistralKey && res.status === 404) {
            console.warn('Edge Function not deployed (404), falling back to Mistral')
            let acc = ''
            for await (const token of streamMistralDirect(mistralKey, history)) {
              acc += token
              updateLast({ content: acc })
            }
          } else {
            throw new Error(`Edge Function error ${res.status}: ${await res.text()}`)
          }
        } else {
          // Parse SSE stream from Edge Function
          const reader  = res.body!.getReader()
          const decoder = new TextDecoder()
          let acc = ''
          outer: while (true) {
            const { done, value } = await reader.read()
            if (done) break
            const chunk = decoder.decode(value, { stream: true })
            for (const line of chunk.split('\n')) {
              if (!line.startsWith('data: ')) continue
              const data = line.slice(6).trim()
              if (data === '[DONE]') break outer
              try {
                const p = JSON.parse(data)
                acc += p?.content ?? ''
                updateLast({ content: acc })
              } catch { /* skip */ }
            }
          }
        }
      } else {
        // ── Direct Mistral (dev shortcut — VITE_MISTRAL_API_KEY set) ───────
        const mistralKey = import.meta.env.VITE_MISTRAL_API_KEY as string | undefined
        if (mistralKey) {
          try {
            const history = messages
              .filter(m => m.content.length > 0 && !m.streaming)
              .map(m => ({ role: m.role, content: m.content }))
            history.push({ role: 'user', content: text })
            let acc = ''
            for await (const token of streamMistralDirect(mistralKey, history)) {
              acc += token
              updateLast({ content: acc })
            }
          } catch (e) {
            // If rate limited or error, fall back to mock
            const msg = e instanceof Error ? e.message : ''
            if (msg.includes('RATE_LIMITED') || msg.includes('429')) {
              console.warn('Mistral rate limited, using mock responses')
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
          // ── Mock streaming (no keys configured) ────────────────────────
          const response = getMockResponse(text)
          let acc = ''
          for await (const chunk of mockStream(response)) {
            acc += chunk
            updateLast({ content: acc })
          }
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
