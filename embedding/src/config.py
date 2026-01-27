"""
Centralized configuration for embedding service.
"""
import os


# Server Configuration
EMBEDDING_HOST = os.getenv("EMBEDDING_HOST", "0.0.0.0")
EMBEDDING_PORT = int(os.getenv("EMBEDDING_PORT", "8001"))

# Model Configuration
EMBEDDING_MODEL_PATH = os.getenv(
    "EMBEDDING_MODEL_PATH",
    "/home/naeemgtng/projects/example-rag/embedding/models/qwen3-embedding-0.6b"
)
EMBEDDING_MODEL_NAME = os.getenv("EMBEDDING_MODEL_NAME", "Qwen/Qwen3-Embedding-0.6B")
EMBEDDING_DEVICE = os.getenv("EMBEDDING_DEVICE", "auto")
EMBEDDING_DTYPE = os.getenv("EMBEDDING_DTYPE", "auto")

# Embedding Configuration
EMBEDDING_MAX_LENGTH = int(os.getenv("EMBEDDING_MAX_LENGTH", "8192"))
EMBEDDING_DIMENSION = int(os.getenv("EMBEDDING_DIMENSION", "1024"))  # Max 1024 for 0.6B
EMBEDDING_NORMALIZE = os.getenv("EMBEDDING_NORMALIZE", "true").lower() == "true"

# Flash Attention
USE_FLASH_ATTENTION = os.getenv("USE_FLASH_ATTENTION", "true").lower() == "true"

# Default instruction for retrieval tasks
DEFAULT_INSTRUCTION = os.getenv(
    "DEFAULT_INSTRUCTION",
    "Given a web search query, retrieve relevant passages that answer the query"
)
