"""
Embedding functions for Qwen3-Embedding model.

This module provides the core embedding logic including:
- Last token pooling (required for Qwen3 embeddings)
- Instruction formatting for queries
- Batch encoding with normalization
"""
import torch
import torch.nn.functional as F
from torch import Tensor


def last_token_pool(last_hidden_states: Tensor, attention_mask: Tensor) -> Tensor:
    """
    Extract embeddings from the last token of each sequence.

    Qwen3-Embedding uses left padding, so the last token contains
    the sequence representation. This function handles both left
    and right padding cases.

    Args:
        last_hidden_states: Hidden states from model output [batch, seq_len, hidden_dim]
        attention_mask: Attention mask [batch, seq_len]

    Returns:
        Pooled embeddings [batch, hidden_dim]
    """
    # Check if left padding (all sequences end with real token)
    left_padding = attention_mask[:, -1].sum() == attention_mask.shape[0]

    if left_padding:
        # Simple case: just take the last token
        return last_hidden_states[:, -1]

    # Right padding: find the last real token for each sequence
    sequence_lengths = attention_mask.sum(dim=1) - 1
    batch_size = last_hidden_states.shape[0]

    return last_hidden_states[
        torch.arange(batch_size, device=last_hidden_states.device),
        sequence_lengths
    ]


def format_instruction(instruction: str, query: str) -> str:
    """
    Format a query with instruction prefix for Qwen3-Embedding.

    Using instructions improves retrieval performance by 1-5%.
    Instructions should be in English even for multilingual queries.

    Args:
        instruction: Task description (e.g., "Given a web search query...")
        query: The actual query text

    Returns:
        Formatted string: "Instruct: {instruction}\nQuery:{query}"
    """
    return f"Instruct: {instruction}\nQuery:{query}"


def normalize_embeddings(embeddings: Tensor) -> Tensor:
    """
    L2 normalize embeddings.

    Normalized embeddings allow using dot product for similarity
    (equivalent to cosine similarity).

    Args:
        embeddings: Input embeddings [batch, dim]

    Returns:
        L2 normalized embeddings [batch, dim]
    """
    return F.normalize(embeddings, p=2, dim=1)


def truncate_dimension(embeddings: Tensor, dimension: int) -> Tensor:
    """
    Truncate embeddings to a smaller dimension (MRL - Matryoshka Representation Learning).

    Qwen3-Embedding-0.6B supports dimensions from 32 to 1024.
    Smaller dimensions trade accuracy for speed/storage.

    Args:
        embeddings: Input embeddings [batch, full_dim]
        dimension: Target dimension (must be <= full_dim)

    Returns:
        Truncated embeddings [batch, dimension]
    """
    if dimension >= embeddings.shape[1]:
        return embeddings
    return embeddings[:, :dimension]


def compute_similarity(query_embeddings: Tensor, document_embeddings: Tensor) -> Tensor:
    """
    Compute similarity scores between queries and documents.

    Assumes embeddings are L2 normalized, so dot product = cosine similarity.

    Args:
        query_embeddings: Query embeddings [num_queries, dim]
        document_embeddings: Document embeddings [num_docs, dim]

    Returns:
        Similarity matrix [num_queries, num_docs]
    """
    return query_embeddings @ document_embeddings.T
