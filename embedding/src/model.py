"""
Model loading module with singleton pattern for Qwen3-Embedding.
"""
import logging
from dataclasses import dataclass
from threading import Lock
from typing import Optional

import torch
from torch import Tensor
from transformers import AutoTokenizer, AutoModel

from src.config import (
    EMBEDDING_MODEL_PATH,
    EMBEDDING_MODEL_NAME,
    EMBEDDING_DEVICE,
    EMBEDDING_DTYPE,
    EMBEDDING_MAX_LENGTH,
    EMBEDDING_DIMENSION,
    EMBEDDING_NORMALIZE,
    USE_FLASH_ATTENTION,
    DEFAULT_INSTRUCTION,
)
from src.embedding import (
    last_token_pool,
    format_instruction,
    normalize_embeddings,
    truncate_dimension,
)

logger = logging.getLogger(__name__)


@dataclass
class ModelResources:
    """Container for model resources."""
    model: AutoModel
    tokenizer: AutoTokenizer
    device: torch.device
    dtype: Optional[torch.dtype]
    lock: Lock


_resources: Optional[ModelResources] = None
_load_lock = Lock()


def _resolve_device() -> torch.device:
    """Resolve the device to use for the model."""
    if EMBEDDING_DEVICE == "auto":
        return torch.device("cuda" if torch.cuda.is_available() else "cpu")
    return torch.device(EMBEDDING_DEVICE)


def _resolve_dtype() -> Optional[torch.dtype]:
    """Resolve the dtype to use for the model."""
    if EMBEDDING_DTYPE == "auto":
        return None
    return getattr(torch, EMBEDDING_DTYPE, None)


def get_model() -> ModelResources:
    """
    Get or load the embedding model (singleton pattern).

    Returns:
        ModelResources containing model, tokenizer, and config.
    """
    global _resources

    if _resources is not None:
        return _resources

    with _load_lock:
        # Double-check after acquiring lock
        if _resources is not None:
            return _resources

        device = _resolve_device()
        dtype = _resolve_dtype()

        logger.info("Loading embedding model from %s (%s)", EMBEDDING_MODEL_PATH, EMBEDDING_MODEL_NAME)

        # Load tokenizer with left padding (required for Qwen3-Embedding)
        tokenizer = AutoTokenizer.from_pretrained(
            EMBEDDING_MODEL_PATH,
            local_files_only=True,
            padding_side="left",
        )

        # Build model kwargs
        model_kwargs = {"local_files_only": True}

        if dtype is not None:
            model_kwargs["torch_dtype"] = dtype

        if USE_FLASH_ATTENTION:
            model_kwargs["attn_implementation"] = "flash_attention_2"
            logger.info("Flash Attention 2 enabled")

        model = AutoModel.from_pretrained(EMBEDDING_MODEL_PATH, **model_kwargs)
        model = model.to(device)
        model.eval()

        _resources = ModelResources(
            model=model,
            tokenizer=tokenizer,
            device=device,
            dtype=dtype,
            lock=Lock(),
        )

        logger.info("Embedding model loaded on %s", device)
        return _resources


def encode_texts(
    texts: list[str],
    is_query: bool = False,
    instruction: Optional[str] = None,
    normalize: bool = EMBEDDING_NORMALIZE,
    dimension: int = EMBEDDING_DIMENSION,
) -> Tensor:
    """
    Encode texts into embeddings.

    Args:
        texts: List of texts to encode
        is_query: If True, format texts with instruction prefix
        instruction: Custom instruction (uses DEFAULT_INSTRUCTION if None)
        normalize: Whether to L2 normalize embeddings
        dimension: Output embedding dimension (truncated via MRL)

    Returns:
        Embeddings tensor [batch, dimension]
    """
    resources = get_model()

    # Format queries with instruction if needed
    if is_query:
        inst = instruction or DEFAULT_INSTRUCTION
        texts = [format_instruction(inst, text) for text in texts]

    # Tokenize
    batch_dict = resources.tokenizer(
        texts,
        padding=True,
        truncation=True,
        max_length=EMBEDDING_MAX_LENGTH,
        return_tensors="pt",
    )
    batch_dict = {k: v.to(resources.device) for k, v in batch_dict.items()}

    # Generate embeddings
    with resources.lock:
        with torch.no_grad():
            outputs = resources.model(**batch_dict)

    # Pool from last token
    embeddings = last_token_pool(outputs.last_hidden_state, batch_dict["attention_mask"])

    # Truncate dimension if needed (MRL)
    embeddings = truncate_dimension(embeddings, dimension)

    # Normalize if requested
    if normalize:
        embeddings = normalize_embeddings(embeddings)

    return embeddings


def encode_query(
    query: str,
    instruction: Optional[str] = None,
    normalize: bool = EMBEDDING_NORMALIZE,
    dimension: int = EMBEDDING_DIMENSION,
) -> Tensor:
    """
    Encode a single query with instruction formatting.

    Args:
        query: Query text
        instruction: Custom instruction (uses DEFAULT_INSTRUCTION if None)
        normalize: Whether to L2 normalize
        dimension: Output embedding dimension

    Returns:
        Embedding tensor [1, dimension]
    """
    return encode_texts(
        [query],
        is_query=True,
        instruction=instruction,
        normalize=normalize,
        dimension=dimension,
    )


def encode_documents(
    documents: list[str],
    normalize: bool = EMBEDDING_NORMALIZE,
    dimension: int = EMBEDDING_DIMENSION,
) -> Tensor:
    """
    Encode documents (without instruction prefix).

    Args:
        documents: List of document texts
        normalize: Whether to L2 normalize
        dimension: Output embedding dimension

    Returns:
        Embeddings tensor [batch, dimension]
    """
    return encode_texts(
        documents,
        is_query=False,
        normalize=normalize,
        dimension=dimension,
    )
