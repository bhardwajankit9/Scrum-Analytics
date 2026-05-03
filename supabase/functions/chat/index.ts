// Supabase Edge Function: chat
// Streams responses from Mistral API back to the browser as SSE.
// Also persists messages to Supabase when a conversation_id is provided.
//
// Deploy:
//   supabase secrets set MISTRAL_API_KEY=<your-key>
//   supabase functions deploy chat

import { serve } from "https://deno.land/std@0.208.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

// ── Config ────────────────────────────────────────────────────────────────
const MISTRAL_API_KEY      = Deno.env.get("MISTRAL_API_KEY") ?? ""
const MISTRAL_MODEL        = Deno.env.get("MISTRAL_MODEL") ?? "mistral-small-latest"
const SUPABASE_URL         = Deno.env.get("SUPABASE_URL") ?? ""
const SUPABASE_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""

const SYSTEM_PROMPT =
  Deno.env.get("SYSTEM_PROMPT") ??
  "You are a helpful Scrum and Agile assistant embedded in a team management app. " +
  "Answer questions about Scrum ceremonies, sprint planning, velocity, retrospectives, " +
  "and team dynamics concisely and clearly."

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
}

// ── Types ─────────────────────────────────────────────────────────────────
interface ChatMessage {
  role: "user" | "assistant" | "system"
  content: string
}

interface ChatRequest {
  messages: ChatMessage[]
  conversation_id?: string
  model?: string
  temperature?: number
  max_tokens?: number
}

// Mistral uses "user" | "assistant" roles
interface MistralMessage { role: "user" | "assistant" | "system"; content: string }

// ── Helpers ───────────────────────────────────────────────────────────────

function errorResponse(msg: string, status = 400): Response {
  return new Response(JSON.stringify({ error: msg }), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  })
}

/** Map messages to Mistral format (system, user, assistant roles) */
function toMistralMessages(messages: ChatMessage[]): MistralMessage[] {
  return messages.map(m => ({
    role: m.role as "user" | "assistant" | "system",
    content: m.content,
  }))
}

async function saveMessages(
  supabase: ReturnType<typeof createClient>,
  conversationId: string,
  userContent: string,
  assistantContent: string,
  userId?: string,
) {
  const rows = [
    { conversation_id: conversationId, role: "user",      content: userContent,      user_id: userId ?? null },
    { conversation_id: conversationId, role: "assistant", content: assistantContent, user_id: null },
  ]
  const { error } = await supabase.from("chat_messages").insert(rows)
  if (error) console.error("Failed to persist messages:", error.message)
}

// ── Handler ───────────────────────────────────────────────────────────────

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders })
  }
  if (req.method !== "POST") return errorResponse("Method not allowed", 405)

  // ── Auth (reads user JWT to associate messages with user) ────────────────
  const authHeader = req.headers.get("Authorization") ?? ""
  let userId: string | undefined
  if (authHeader.startsWith("Bearer ") && SUPABASE_URL && SUPABASE_SERVICE_KEY) {
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)
    const { data } = await supabase.auth.getUser(authHeader.replace("Bearer ", ""))
    userId = data?.user?.id
  }

  // ── Parse body ───────────────────────────────────────────────────────────
  let body: ChatRequest
  try {
    body = await req.json()
  } catch {
    return errorResponse("Invalid JSON body")
  }

  const { messages, conversation_id, model, temperature = 0.7, max_tokens = 1024 } = body

  if (!Array.isArray(messages) || messages.length === 0) {
    return errorResponse("messages array is required and must not be empty")
  }
  if (!MISTRAL_API_KEY) {
    return errorResponse("MISTRAL_API_KEY is not configured on the server", 500)
  }

  const lastUserMessage = [...messages].reverse().find(m => m.role === "user")?.content ?? ""
  const mistralModel    = model ?? MISTRAL_MODEL

  // Mistral streaming endpoint
  const mistralUrl = "https://api.mistral.ai/v1/chat/completions"

  // ── Call Mistral ──────────────────────────────────────────────────────────
  const mistralResp = await fetch(mistralUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${MISTRAL_API_KEY}`,
    },
    body: JSON.stringify({
      model: mistralModel,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        ...toMistralMessages(messages),
      ],
      temperature,
      max_tokens,
      stream: true,
    }),
  })

  if (!mistralResp.ok) {
    const errText = await mistralResp.text()
    console.error("Mistral API error:", errText)
    return errorResponse(`Mistral API error: ${mistralResp.status}`, 502)
  }

  // ── Transform Mistral SSE → our SSE format ────────────────────────────────
  let accumulatedContent = ""

  const stream = new ReadableStream({
    async start(controller) {
      const reader  = mistralResp.body!.getReader()
      const decoder = new TextDecoder()

      try {
        while (true) {
          const { done, value } = await reader.read()
          if (done) {
            // Stream ended — persist to Supabase
            if (conversation_id && SUPABASE_URL && SUPABASE_SERVICE_KEY) {
              const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)
              await saveMessages(supabase, conversation_id, lastUserMessage, accumulatedContent, userId)
            }
            controller.enqueue(new TextEncoder().encode("data: [DONE]\n\n"))
            controller.close()
            return
          }

          const text = decoder.decode(value, { stream: true })
          for (const line of text.split("\n")) {
            const trimmed = line.trim()
            if (!trimmed.startsWith("data:")) continue
            const data = trimmed.slice(5).trim()
            if (!data || data === "[DONE]") continue

            try {
              const parsed = JSON.parse(data)
              // Mistral shape: choices[0].delta.content
              const token: string =
                parsed?.choices?.[0]?.delta?.content ?? ""
              if (token) {
                accumulatedContent += token
                controller.enqueue(
                  new TextEncoder().encode(`data: ${JSON.stringify({ content: token })}\n\n`)
                )
              }
            } catch {
              // skip malformed chunk
            }
          }
        }
      } catch (err) {
        console.error("Stream read error:", err)
        controller.error(err)
      }
    },
  })

  return new Response(stream, {
    headers: {
      ...corsHeaders,
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      "X-Accel-Buffering": "no",
    },
  })
})
