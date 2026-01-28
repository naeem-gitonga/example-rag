"""
FastAPI server for LLM chat completion service.
"""
import json
import logging
import time

# Configure logging to show INFO level messages
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
)
from contextlib import asynccontextmanager
from threading import Thread
from typing import Annotated, AsyncIterator

from fastapi import FastAPI, HTTPException, Depends
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field

from src.config import (
    LLM_MAX_NEW_TOKENS,
    DEFAULT_TEMPERATURE,
    DEFAULT_TOP_P,
)
from src.model import LLMServiceProtocol
from src.dependencies import get_llm_service

logger = logging.getLogger(__name__)


def load_model_background(llm_service: LLMServiceProtocol) -> None:
    """Load model in background thread."""
    try:
        logger.info("Loading model in background...")
        llm_service.load_model()
        logger.info("Model loaded and ready")
    except Exception as e:
        logger.error("Failed to load model: %s", e)
        raise


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan manager."""
    # Startup: load model in background
    llm_service = get_llm_service()
    thread = Thread(target=load_model_background, args=(llm_service,), daemon=True)
    thread.start()
    yield
    # Shutdown: nothing to clean up


app = FastAPI(
    title="LLM Service",
    description="Chat completion service using Qwen2.5-3B-Instruct",
    version="0.1.0",
    lifespan=lifespan,
)


# Type alias for dependency injection
LLMServiceDep = Annotated[LLMServiceProtocol, Depends(get_llm_service)]


# Request/Response Models

class Message(BaseModel):
    """Chat message."""
    role: str = Field(..., description="Message role: 'system', 'user', or 'assistant'")
    content: str = Field(..., description="Message content")


class ChatCompletionRequest(BaseModel):
    """Request for chat completion."""
    messages: list[Message] = Field(..., description="List of chat messages")
    max_tokens: int = Field(LLM_MAX_NEW_TOKENS, description="Maximum tokens to generate")
    temperature: float = Field(DEFAULT_TEMPERATURE, ge=0.0, le=2.0, description="Sampling temperature")
    top_p: float = Field(DEFAULT_TOP_P, ge=0.0, le=1.0, description="Nucleus sampling parameter")
    stream: bool = Field(False, description="Whether to stream the response")


class ChatCompletionChoice(BaseModel):
    """A single completion choice."""
    index: int
    message: Message
    finish_reason: str


class ChatCompletionUsage(BaseModel):
    """Token usage statistics."""
    prompt_tokens: int
    completion_tokens: int
    total_tokens: int


class ChatCompletionResponse(BaseModel):
    """Response containing chat completion."""
    id: str
    object: str = "chat.completion"
    created: int
    model: str
    choices: list[ChatCompletionChoice]
    usage: ChatCompletionUsage


class HealthResponse(BaseModel):
    """Health check response."""
    status: str
    model: str
    model_loaded: bool


# Streaming helpers

def create_stream_chunk(
    chunk_id: str,
    model: str,
    content: str | None = None,
    finish_reason: str | None = None,
) -> dict:
    """Create an OpenAI-compatible stream chunk."""
    delta = {}
    if content is not None:
        delta["content"] = content
    if finish_reason is None and content is not None:
        delta["role"] = "assistant"

    return {
        "id": chunk_id,
        "object": "chat.completion.chunk",
        "created": int(time.time()),
        "model": model,
        "choices": [
            {
                "index": 0,
                "delta": delta,
                "finish_reason": finish_reason,
            }
        ],
    }


async def stream_response(
    llm: LLMServiceProtocol,
    messages: list[dict],
    max_tokens: int,
    temperature: float,
    top_p: float,
) -> AsyncIterator[str]:
    """Generate SSE stream of chat completion chunks."""
    chunk_id = f"chatcmpl-{int(time.time())}"
    model = llm.model_name

    # Stream tokens
    for token in llm.generate_stream(
        messages=messages,
        max_new_tokens=max_tokens,
        temperature=temperature,
        top_p=top_p,
    ):
        chunk = create_stream_chunk(chunk_id, model, content=token)
        yield f"data: {json.dumps(chunk)}\n\n"

    # Send final chunk with finish_reason
    final_chunk = create_stream_chunk(chunk_id, model, finish_reason="stop")
    yield f"data: {json.dumps(final_chunk)}\n\n"

    # Send done signal
    yield "data: [DONE]\n\n"


# Endpoints

@app.get("/health", response_model=HealthResponse)
async def health(llm: LLMServiceDep):
    """Health check endpoint."""
    return HealthResponse(
        status="ok" if llm.is_ready else "loading",
        model=llm.model_name,
        model_loaded=llm.is_ready,
    )


@app.post("/v1/chat/completions")
async def chat_completions(request: ChatCompletionRequest, llm: LLMServiceDep):
    """
    Generate a chat completion.

    OpenAI-compatible endpoint for chat completions.
    Set stream=true for Server-Sent Events streaming response.
    """
    if not llm.is_ready:
        raise HTTPException(status_code=503, detail="Model not ready")

    # Convert messages to dict format
    messages = [{"role": m.role, "content": m.content} for m in request.messages]

    # Streaming response
    if request.stream:
        return StreamingResponse(
            stream_response(
                llm=llm,
                messages=messages,
                max_tokens=request.max_tokens,
                temperature=request.temperature,
                top_p=request.top_p,
            ),
            media_type="text/event-stream",
            headers={
                "Cache-Control": "no-cache",
                "Connection": "keep-alive",
                "X-Accel-Buffering": "no",  # Disable nginx buffering
            },
        )

    # Non-streaming response
    response_text = llm.generate(
        messages=messages,
        max_new_tokens=request.max_tokens,
        temperature=request.temperature,
        top_p=request.top_p,
    )

    # Estimate token counts (rough approximation)
    prompt_tokens = sum(len(m.content.split()) * 1.3 for m in request.messages)
    completion_tokens = len(response_text.split()) * 1.3

    return ChatCompletionResponse(
        id=f"chatcmpl-{int(time.time())}",
        created=int(time.time()),
        model=llm.model_name,
        choices=[
            ChatCompletionChoice(
                index=0,
                message=Message(role="assistant", content=response_text),
                finish_reason="stop",
            )
        ],
        usage=ChatCompletionUsage(
            prompt_tokens=int(prompt_tokens),
            completion_tokens=int(completion_tokens),
            total_tokens=int(prompt_tokens + completion_tokens),
        ),
    )


def serve():
    """Run the FastAPI server."""
    import uvicorn
    from src.config import LLM_HOST, LLM_PORT

    uvicorn.run(
        app,
        host=LLM_HOST,
        port=LLM_PORT,
        log_level="info",
    )


if __name__ == "__main__":
    serve()
