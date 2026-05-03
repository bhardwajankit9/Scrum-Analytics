"""
Scrum Analytics – AI Chat Backend
FastAPI service that streams responses from a self-hosted Mistral model via Ollama.

Endpoints
---------
POST /chat/stream   – SSE streaming chat response
POST /chat          – blocking (single JSON) chat response
GET  /health        – liveness probe
"""

from __future__ import annotations

import asyncio
import json
import logging
import os
import time
from collections import defaultdict
from typing import AsyncGenerator

import httpx
from fastapi import Depends, FastAPI, Header, HTTPException, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field

# ---------------------------------------------------------------------------
# Config (reads from environment / .env file loaded externally or via Docker)
# ---------------------------------------------------------------------------

OLLAMA_BASE_URL: str = os.getenv("OLLAMA_BASE_URL", "http://ollama:11434")
MISTRAL_MODEL: str = os.getenv("MISTRAL_MODEL", "mistral")
API_SECRET_KEY: str = os.getenv("API_SECRET_KEY", "")          # shared secret
ALLOWED_ORIGINS: list[str] = os.getenv(
    "ALLOWED_ORIGINS", "http://localhost:5173,http://localhost:3000"
).split(",")

# Rate-limiting (simple in-memory; swap for Redis in multi-replica deploy)
RATE_LIMIT_REQUESTS: int = int(os.getenv("RATE_LIMIT_REQUESTS", "20"))   # per window
RATE_LIMIT_WINDOW_S: int = int(os.getenv("RATE_LIMIT_WINDOW_S", "60"))   # seconds

SYSTEM_PROMPT: str = os.getenv(
    "SYSTEM_PROMPT",
    (
        "You are a helpful Scrum and Agile assistant embedded in a team management app. "
        "Answer questions about Scrum ceremonies, sprint planning, velocity, retrospectives, "
        "and team dynamics concisely and clearly."
    ),
)

# ---------------------------------------------------------------------------
# Logging
# ---------------------------------------------------------------------------
logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Rate limiter
# ---------------------------------------------------------------------------
_rate_store: dict[str, list[float]] = defaultdict(list)


def _check_rate_limit(client_id: str) -> None:
    now = time.time()
    window_start = now - RATE_LIMIT_WINDOW_S
    calls = [t for t in _rate_store[client_id] if t > window_start]
    if len(calls) >= RATE_LIMIT_REQUESTS:
        retry_after = int(RATE_LIMIT_WINDOW_S - (now - calls[0]))
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail=f"Rate limit exceeded. Retry after {retry_after}s.",
            headers={"Retry-After": str(retry_after)},
        )
    calls.append(now)
    _rate_store[client_id] = calls

# ---------------------------------------------------------------------------
# Auth dependency (optional; set API_SECRET_KEY to enable)
# ---------------------------------------------------------------------------

async def verify_api_key(x_api_key: str | None = Header(default=None)) -> None:
    if not API_SECRET_KEY:
        return  # auth disabled
    if x_api_key != API_SECRET_KEY:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or missing X-Api-Key header.",
        )

# ---------------------------------------------------------------------------
# Pydantic models
# ---------------------------------------------------------------------------

class Message(BaseModel):
    role: str = Field(..., pattern="^(user|assistant|system)$")
    content: str = Field(..., min_length=1, max_length=16_000)


class ChatRequest(BaseModel):
    messages: list[Message] = Field(..., min_length=1)
    model: str | None = None           # override per-request
    temperature: float = Field(default=0.7, ge=0.0, le=2.0)
    max_tokens: int = Field(default=1024, ge=1, le=8192)
    stream: bool = True

# ---------------------------------------------------------------------------
# FastAPI app
# ---------------------------------------------------------------------------
app = FastAPI(title="Scrum Analytics AI Chat", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ---------------------------------------------------------------------------
# Ollama helpers
# ---------------------------------------------------------------------------

def _build_ollama_payload(req: ChatRequest) -> dict:
    messages = [{"role": "system", "content": SYSTEM_PROMPT}]
    messages += [m.model_dump() for m in req.messages]
    return {
        "model": req.model or MISTRAL_MODEL,
        "messages": messages,
        "stream": req.stream,
        "options": {
            "temperature": req.temperature,
            "num_predict": req.max_tokens,
        },
    }


async def _stream_ollama(payload: dict) -> AsyncGenerator[str, None]:
    """Yields SSE-formatted chunks from Ollama's streaming chat API."""
    url = f"{OLLAMA_BASE_URL}/api/chat"
    timeout = httpx.Timeout(connect=10.0, read=120.0, write=10.0, pool=5.0)

    async with httpx.AsyncClient(timeout=timeout) as client:
        try:
            async with client.stream("POST", url, json=payload) as resp:
                resp.raise_for_status()
                async for line in resp.aiter_lines():
                    if not line.strip():
                        continue
                    try:
                        chunk = json.loads(line)
                    except json.JSONDecodeError:
                        continue

                    token = chunk.get("message", {}).get("content", "")
                    if token:
                        yield f"data: {json.dumps({'content': token})}\n\n"

                    if chunk.get("done"):
                        yield "data: [DONE]\n\n"
                        return

        except httpx.ConnectError:
            yield f"data: {json.dumps({'error': 'Cannot reach Ollama. Is it running?'})}\n\n"
        except httpx.HTTPStatusError as exc:
            yield f"data: {json.dumps({'error': f'Ollama returned {exc.response.status_code}'})}\n\n"
        except asyncio.CancelledError:
            logger.info("Client disconnected – streaming cancelled.")


async def _blocking_ollama(payload: dict) -> str:
    """Returns full response text from Ollama (non-streaming)."""
    payload = {**payload, "stream": False}
    url = f"{OLLAMA_BASE_URL}/api/chat"
    timeout = httpx.Timeout(120.0)

    async with httpx.AsyncClient(timeout=timeout) as client:
        resp = await client.post(url, json=payload)
        resp.raise_for_status()
        data = resp.json()
        return data.get("message", {}).get("content", "")

# ---------------------------------------------------------------------------
# Routes
# ---------------------------------------------------------------------------

@app.get("/health")
async def health():
    """Liveness probe – also pings Ollama."""
    try:
        async with httpx.AsyncClient(timeout=5) as client:
            r = await client.get(f"{OLLAMA_BASE_URL}/api/tags")
            models = [m["name"] for m in r.json().get("models", [])]
    except Exception as exc:
        return {"status": "degraded", "ollama": str(exc)}
    return {"status": "ok", "ollama_models": models}


@app.post(
    "/chat/stream",
    summary="Streaming chat (SSE)",
    dependencies=[Depends(verify_api_key)],
)
async def chat_stream(req: ChatRequest, request: Request):
    client_ip = request.client.host if request.client else "unknown"
    _check_rate_limit(client_ip)
    logger.info("stream request from %s, messages=%d", client_ip, len(req.messages))
    payload = _build_ollama_payload(req)
    return StreamingResponse(
        _stream_ollama(payload),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",   # disable nginx buffering
        },
    )


@app.post(
    "/chat",
    summary="Blocking chat (single JSON response)",
    dependencies=[Depends(verify_api_key)],
)
async def chat_blocking(req: ChatRequest, request: Request):
    client_ip = request.client.host if request.client else "unknown"
    _check_rate_limit(client_ip)
    logger.info("blocking request from %s", client_ip)
    req.stream = False
    payload = _build_ollama_payload(req)
    content = await _blocking_ollama(payload)
    return {"role": "assistant", "content": content}
