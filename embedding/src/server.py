"""
FastAPI server for embedding service.
"""
import logging
from contextlib import asynccontextmanager
from threading import Thread, Event
from typing import Optional

from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field

from src.config import (
    EMBEDDING_MODEL_NAME,
    EMBEDDING_DIMENSION,
    EMBEDDING_NORMALIZE,
    DEFAULT_INSTRUCTION,
)
from src.model import get_model, encode_texts, encode_query, encode_documents

logger = logging.getLogger(__name__)

model_ready = Event()


def load_model_background():
    """Load model in background thread."""
    try:
        logger.info("Loading model in background...")
        get_model()
        model_ready.set()
        logger.info("Model loaded and ready")
    except Exception as e:
        logger.error("Failed to load model: %s", e)
        raise


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan manager."""
    # Startup: load model in background
    thread = Thread(target=load_model_background, daemon=True)
    thread.start()
    yield
    # Shutdown: nothing to clean up


app = FastAPI(
    title="Embedding Service",
    description="Text embedding service using Qwen3-Embedding-0.6B",
    version="0.1.0",
    lifespan=lifespan,
)


# Request/Response Models

class EmbedRequest(BaseModel):
    """Request for embedding text(s)."""
    text: str | list[str] = Field(..., description="Text or list of texts to embed")
    is_query: bool = Field(False, description="Whether to format as query with instruction")
    instruction: Optional[str] = Field(None, description="Custom instruction for queries")
    normalize: bool = Field(EMBEDDING_NORMALIZE, description="Whether to L2 normalize embeddings")
    dimension: int = Field(EMBEDDING_DIMENSION, description="Output embedding dimension")


class EmbedResponse(BaseModel):
    """Response containing embeddings."""
    embeddings: list[list[float]] = Field(..., description="List of embedding vectors")
    dimension: int = Field(..., description="Embedding dimension")
    normalized: bool = Field(..., description="Whether embeddings are normalized")


class QueryRequest(BaseModel):
    """Request for embedding a query."""
    query: str = Field(..., description="Query text")
    instruction: Optional[str] = Field(None, description="Custom instruction")
    normalize: bool = Field(EMBEDDING_NORMALIZE, description="Whether to L2 normalize")
    dimension: int = Field(EMBEDDING_DIMENSION, description="Output embedding dimension")


class QueryResponse(BaseModel):
    """Response containing query embedding."""
    embedding: list[float] = Field(..., description="Query embedding vector")
    dimension: int = Field(..., description="Embedding dimension")
    normalized: bool = Field(..., description="Whether embedding is normalized")


class DocumentsRequest(BaseModel):
    """Request for embedding documents."""
    documents: list[str] = Field(..., description="List of document texts")
    normalize: bool = Field(EMBEDDING_NORMALIZE, description="Whether to L2 normalize")
    dimension: int = Field(EMBEDDING_DIMENSION, description="Output embedding dimension")


class DocumentsResponse(BaseModel):
    """Response containing document embeddings."""
    embeddings: list[list[float]] = Field(..., description="List of document embedding vectors")
    dimension: int = Field(..., description="Embedding dimension")
    normalized: bool = Field(..., description="Whether embeddings are normalized")
    count: int = Field(..., description="Number of documents embedded")


class HealthResponse(BaseModel):
    """Health check response."""
    status: str
    model: str
    model_loaded: bool
    default_dimension: int
    default_instruction: str


# Endpoints

@app.get("/health", response_model=HealthResponse)
async def health():
    """Health check endpoint."""
    return HealthResponse(
        status="ok" if model_ready.is_set() else "loading",
        model=EMBEDDING_MODEL_NAME,
        model_loaded=model_ready.is_set(),
        default_dimension=EMBEDDING_DIMENSION,
        default_instruction=DEFAULT_INSTRUCTION,
    )


@app.post("/embed", response_model=EmbedResponse)
async def embed(request: EmbedRequest):
    """
    Embed text(s) into vectors.

    Supports both single text and batch embedding.
    Use is_query=true for query texts (adds instruction prefix).
    """
    if not model_ready.wait(timeout=60):
        raise HTTPException(status_code=503, detail="Model not ready")

    # Normalize input to list
    texts = [request.text] if isinstance(request.text, str) else request.text

    embeddings = encode_texts(
        texts,
        is_query=request.is_query,
        instruction=request.instruction,
        normalize=request.normalize,
        dimension=request.dimension,
    )

    return EmbedResponse(
        embeddings=embeddings.cpu().tolist(),
        dimension=request.dimension,
        normalized=request.normalize,
    )


@app.post("/embed/query", response_model=QueryResponse)
async def embed_query(request: QueryRequest):
    """
    Embed a query with instruction formatting.

    Queries are automatically formatted with the instruction prefix
    for optimal retrieval performance.
    """
    if not model_ready.wait(timeout=60):
        raise HTTPException(status_code=503, detail="Model not ready")

    embedding = encode_query(
        request.query,
        instruction=request.instruction,
        normalize=request.normalize,
        dimension=request.dimension,
    )

    return QueryResponse(
        embedding=embedding[0].cpu().tolist(),
        dimension=request.dimension,
        normalized=request.normalize,
    )


@app.post("/embed/documents", response_model=DocumentsResponse)
async def embed_documents(request: DocumentsRequest):
    """
    Embed documents (without instruction prefix).

    Documents are embedded as-is, without instruction formatting.
    """
    if not model_ready.wait(timeout=60):
        raise HTTPException(status_code=503, detail="Model not ready")

    embeddings = encode_documents(
        request.documents,
        normalize=request.normalize,
        dimension=request.dimension,
    )

    return DocumentsResponse(
        embeddings=embeddings.cpu().tolist(),
        dimension=request.dimension,
        normalized=request.normalize,
        count=len(request.documents),
    )


def serve():
    """Run the FastAPI server."""
    import uvicorn
    from src.config import EMBEDDING_HOST, EMBEDDING_PORT

    uvicorn.run(
        app,
        host=EMBEDDING_HOST,
        port=EMBEDDING_PORT,
        log_level="info",
    )


if __name__ == "__main__":
    serve()
