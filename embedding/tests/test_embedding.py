"""
Unit tests for embedding functions.

These tests verify the core embedding logic without requiring the model.
"""
import pytest
import torch

from src.embedding import (
    last_token_pool,
    format_instruction,
    normalize_embeddings,
    truncate_dimension,
    compute_similarity,
)


class TestLastTokenPool:
    """Tests for last_token_pool function."""

    def test_left_padding_simple(self):
        """Test pooling with left padding (all sequences end with real token)."""
        batch_size, seq_len, hidden_dim = 2, 5, 4
        hidden_states = torch.randn(batch_size, seq_len, hidden_dim)
        # All 1s means no padding - left padding scenario
        attention_mask = torch.ones(batch_size, seq_len)

        result = last_token_pool(hidden_states, attention_mask)

        assert result.shape == (batch_size, hidden_dim)
        # Should return the last token for each sequence
        torch.testing.assert_close(result, hidden_states[:, -1])

    def test_right_padding(self):
        """Test pooling with right padding (sequences have different lengths)."""
        batch_size, seq_len, hidden_dim = 2, 5, 4
        hidden_states = torch.randn(batch_size, seq_len, hidden_dim)
        # First sequence: length 3, second: length 5
        attention_mask = torch.tensor([
            [1, 1, 1, 0, 0],
            [1, 1, 1, 1, 1],
        ])

        result = last_token_pool(hidden_states, attention_mask)

        assert result.shape == (batch_size, hidden_dim)
        # First sequence should use token at index 2, second at index 4
        torch.testing.assert_close(result[0], hidden_states[0, 2])
        torch.testing.assert_close(result[1], hidden_states[1, 4])

    def test_single_token_sequence(self):
        """Test pooling with single token sequences."""
        batch_size, seq_len, hidden_dim = 1, 1, 4
        hidden_states = torch.randn(batch_size, seq_len, hidden_dim)
        attention_mask = torch.ones(batch_size, seq_len)

        result = last_token_pool(hidden_states, attention_mask)

        assert result.shape == (batch_size, hidden_dim)
        torch.testing.assert_close(result, hidden_states[:, 0])


class TestFormatInstruction:
    """Tests for format_instruction function."""

    def test_basic_formatting(self):
        """Test basic instruction formatting."""
        instruction = "Retrieve relevant documents"
        query = "What is machine learning?"

        result = format_instruction(instruction, query)

        assert result == "Instruct: Retrieve relevant documents\nQuery:What is machine learning?"

    def test_empty_query(self):
        """Test with empty query."""
        instruction = "Search"
        query = ""

        result = format_instruction(instruction, query)

        assert result == "Instruct: Search\nQuery:"

    def test_multiline_query(self):
        """Test with multiline query."""
        instruction = "Answer the question"
        query = "Line 1\nLine 2"

        result = format_instruction(instruction, query)

        assert "Line 1\nLine 2" in result


class TestNormalizeEmbeddings:
    """Tests for normalize_embeddings function."""

    def test_normalization_produces_unit_vectors(self):
        """Test that normalized embeddings have unit norm."""
        embeddings = torch.randn(3, 128)

        result = normalize_embeddings(embeddings)

        # Check norms are approximately 1
        norms = torch.norm(result, p=2, dim=1)
        torch.testing.assert_close(norms, torch.ones(3), atol=1e-6, rtol=1e-6)

    def test_normalization_preserves_direction(self):
        """Test that normalization preserves direction."""
        embeddings = torch.tensor([[3.0, 4.0]])  # 3-4-5 triangle

        result = normalize_embeddings(embeddings)

        expected = torch.tensor([[0.6, 0.8]])  # 3/5, 4/5
        torch.testing.assert_close(result, expected)

    def test_batch_normalization(self):
        """Test normalization works with batches."""
        embeddings = torch.randn(10, 256)

        result = normalize_embeddings(embeddings)

        assert result.shape == embeddings.shape
        norms = torch.norm(result, p=2, dim=1)
        torch.testing.assert_close(norms, torch.ones(10), atol=1e-6, rtol=1e-6)


class TestTruncateDimension:
    """Tests for truncate_dimension function."""

    def test_truncation_reduces_dimension(self):
        """Test that truncation reduces embedding dimension."""
        embeddings = torch.randn(2, 1024)

        result = truncate_dimension(embeddings, 256)

        assert result.shape == (2, 256)
        torch.testing.assert_close(result, embeddings[:, :256])

    def test_truncation_at_full_dimension(self):
        """Test truncation when target equals current dimension."""
        embeddings = torch.randn(2, 512)

        result = truncate_dimension(embeddings, 512)

        assert result.shape == (2, 512)
        torch.testing.assert_close(result, embeddings)

    def test_truncation_larger_than_current(self):
        """Test truncation when target exceeds current dimension."""
        embeddings = torch.randn(2, 256)

        result = truncate_dimension(embeddings, 512)

        # Should return original embeddings unchanged
        assert result.shape == (2, 256)
        torch.testing.assert_close(result, embeddings)

    def test_small_dimension(self):
        """Test truncation to very small dimension (MRL use case)."""
        embeddings = torch.randn(5, 1024)

        result = truncate_dimension(embeddings, 32)

        assert result.shape == (5, 32)


class TestComputeSimilarity:
    """Tests for compute_similarity function."""

    def test_identical_vectors_have_similarity_one(self):
        """Test that identical normalized vectors have similarity 1."""
        embeddings = normalize_embeddings(torch.randn(3, 128))

        result = compute_similarity(embeddings, embeddings)

        # Diagonal should be 1 (self-similarity)
        diagonal = torch.diag(result)
        torch.testing.assert_close(diagonal, torch.ones(3), atol=1e-5, rtol=1e-5)

    def test_orthogonal_vectors_have_similarity_zero(self):
        """Test that orthogonal vectors have similarity 0."""
        query = torch.tensor([[1.0, 0.0]])
        doc = torch.tensor([[0.0, 1.0]])

        result = compute_similarity(query, doc)

        torch.testing.assert_close(result, torch.zeros(1, 1), atol=1e-6, rtol=1e-6)

    def test_similarity_matrix_shape(self):
        """Test that similarity matrix has correct shape."""
        queries = torch.randn(5, 128)
        docs = torch.randn(10, 128)

        result = compute_similarity(queries, docs)

        assert result.shape == (5, 10)

    def test_opposite_vectors_have_negative_similarity(self):
        """Test that opposite vectors have similarity -1."""
        query = normalize_embeddings(torch.tensor([[1.0, 2.0, 3.0]]))
        doc = normalize_embeddings(-query)

        result = compute_similarity(query, doc)

        torch.testing.assert_close(result, torch.tensor([[-1.0]]), atol=1e-5, rtol=1e-5)
