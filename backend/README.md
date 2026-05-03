# Scrum Analytics — AI Chat Backend

> **Note:** The primary backend is now a **Supabase Edge Function** (`supabase/functions/chat/`).  
> The FastAPI + Docker files in this folder are kept as an optional local fallback.

## Recommended: Supabase Edge Function (no Docker needed)

```
Browser / React app
        │  SSE  (text/event-stream)
        ▼
  Supabase Edge Function (/functions/v1/chat)
        │
        ▼
  Mistral AI API  (api.mistral.ai)
        │
        ▼
  Supabase Postgres  (chat_conversations + chat_messages)
```

### 1. Get a Mistral API key

Sign up at https://console.mistral.ai → **API Keys** → create key.

### 2. Set the secret in Supabase

```bash
supabase secrets set GEMINI_API_KEY=<your-key>
# optional overrides:
supabase secrets set GEMINI_MODEL=gemini-2.0-flash
supabase secrets set SYSTEM_PROMPT="You are a helpful Scrum assistant."
```

Available models: `gemini-2.0-flash` (fast/cheap), `gemini-1.5-pro` (best quality), `gemini-2.0-pro` (latest).

### 3. Run the database migration

```bash
supabase db push
# or apply manually in Supabase Studio:
# supabase/migrations/001_schema.sql
```

### 4. Deploy the Edge Function

```bash
supabase functions deploy chat
```

### 5. Configure the frontend

In `Scrum-Analytics/.env.local` (already set):
```
VITE_SUPABASE_URL=https://<your-project-ref>.supabase.co
VITE_SUPABASE_ANON_KEY=<your-anon-key>
```

The chat hook auto-detects the Edge Function URL from `VITE_SUPABASE_URL`.

### 6. Verify

```bash
curl -X POST https://<project>.supabase.co/functions/v1/chat \
  -H "Content-Type: application/json" \
  -H "apikey: <anon-key>" \
  -d '{"messages":[{"role":"user","content":"What is a sprint retrospective?"}]}'
```

> Get a free Gemini API key at https://aistudio.google.com/app/apikey

---

## Optional: FastAPI + Ollama (local, self-hosted)

If you prefer fully self-hosted inference (no external API calls):

```bash
# Requires Docker Desktop installed
cd backend
cp .env.example .env
docker compose up --build
```

See the original [Docker setup below](#environment-variables) — the FastAPI service still works and accepts the same message format.

## Environment variables (FastAPI)

| Variable | Default | Description |
|---|---|---|
| `OLLAMA_BASE_URL` | `http://ollama:11434` | Ollama server URL |
| `MISTRAL_MODEL` | `mistral` | Model name to use |
| `API_SECRET_KEY` | _(empty)_ | Shared secret for `X-Api-Key` header |
| `ALLOWED_ORIGINS` | `localhost:5173,3000` | CORS origins (comma-separated) |
| `RATE_LIMIT_REQUESTS` | `20` | Max requests per window per IP |
| `RATE_LIMIT_WINDOW_S` | `60` | Rate-limit window in seconds |

## Edge Function environment variables

| Variable | Default | Description |
|---|---|---|
| `GEMINI_API_KEY` | **required** | Google Gemini API key (from AI Studio) |
| `GEMINI_MODEL` | `gemini-2.0-flash` | Model to use |
| `SYSTEM_PROMPT` | _(Scrum assistant)_ | Prepended to every conversation |
| `SUPABASE_URL` | auto-injected | Injected by Supabase runtime |
| `SUPABASE_SERVICE_ROLE_KEY` | auto-injected | Injected by Supabase runtime |


## Local dev (without Docker)

### 1. Install Ollama

```bash
# macOS
brew install ollama

# Linux
curl -fsSL https://ollama.com/install.sh | sh
```

### 2. Pull Mistral

```bash
ollama pull mistral              # 7B (~4 GB) — good for CPU
# or
ollama pull mistral:7b-instruct-q4_K_M   # quantised, less RAM
# or
ollama pull mixtral              # 8×7B MoE — needs ≥32 GB RAM
```

### 3. Run the API

```bash
cd backend
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt

# Copy env
cp .env.example .env

# Start FastAPI (auto-reload for dev)
uvicorn main:app --reload --port 8000
```

## Environment variables

| Variable | Default | Description |
|---|---|---|
| `OLLAMA_BASE_URL` | `http://ollama:11434` | Ollama server URL |
| `MISTRAL_MODEL` | `mistral` | Model name to use |
| `API_SECRET_KEY` | _(empty)_ | Shared secret for `X-Api-Key` header; leave empty to disable auth |
| `ALLOWED_ORIGINS` | `localhost:5173,3000` | CORS origins (comma-separated) |
| `RATE_LIMIT_REQUESTS` | `20` | Max requests per window per IP |
| `RATE_LIMIT_WINDOW_S` | `60` | Rate-limit window in seconds |
| `SYSTEM_PROMPT` | _(Scrum assistant)_ | System prompt prepended to every conversation |

## API Reference

### `POST /chat/stream`

Streaming SSE response.

**Request body**
```json
{
  "messages": [
    { "role": "user", "content": "Who is absent today?" }
  ],
  "temperature": 0.7,
  "max_tokens": 1024
}
```

**Response** — `text/event-stream`
```
data: {"content": "Based"}
data: {"content": " on"}
...
data: [DONE]
```

### `POST /chat`

Blocking JSON response (for testing).

### `GET /health`

Returns `{"status": "ok", "ollama_models": [...]}` — also used as Docker healthcheck.

## GPU support (NVIDIA)

Uncomment the `deploy.resources` block in `docker-compose.yml`:

```yaml
deploy:
  resources:
    reservations:
      devices:
        - driver: nvidia
          count: all
          capabilities: [gpu]
```

Requires `nvidia-container-toolkit` installed on the host.

## Upgrading models

```bash
# Switch to Mixtral (8×7B — much better quality, needs ~32 GB RAM)
MISTRAL_MODEL=mixtral docker compose up

# Pull it first if running locally
ollama pull mixtral
```

## Production deployment tips

- Set a strong `API_SECRET_KEY` (`openssl rand -hex 32`)
- Put an **nginx** or **Caddy** reverse proxy in front for HTTPS/TLS
- For multi-replica deploys, swap the in-memory rate limiter for **Redis** (`slowapi` + `redis`)
- Use **Cloud Run** (GPU preview) or **Fly.io Machines** with GPU for managed hosting
