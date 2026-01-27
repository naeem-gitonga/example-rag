"""
Unit tests for model loading and encoding functions.

These tests mock the transformers components to test logic without loading real models.
"""
import pytest
from unittest.mock import patch, MagicMock
from threading import Lock

import torch

from src.model import (
    ModelResources,
    _resolve_device,
    _resolve_dtype,
)


class TestResolveDevice:
    """Tests for device resolution."""

    @patch("src.model.EMBEDDING_DEVICE", "auto")
    @patch("torch.cuda.is_available", return_value=True)
    def test_auto_with_cuda(self, mock_cuda):
        """Test auto device with CUDA available."""
        device = _resolve_device()
        assert device == torch.device("cuda")

    @patch("src.model.EMBEDDING_DEVICE", "auto")
    @patch("torch.cuda.is_available", return_value=False)
    def test_auto_without_cuda(self, mock_cuda):
        """Test auto device without CUDA."""
        device = _resolve_device()
        assert device == torch.device("cpu")

    @patch("src.model.EMBEDDING_DEVICE", "cpu")
    def test_explicit_cpu(self):
        """Test explicit CPU device."""
        device = _resolve_device()
        assert device == torch.device("cpu")

    @patch("src.model.EMBEDDING_DEVICE", "cuda:0")
    def test_explicit_cuda_device(self):
        """Test explicit CUDA device."""
        device = _resolve_device()
        assert device == torch.device("cuda:0")


class TestResolveDtype:
    """Tests for dtype resolution."""

    @patch("src.model.EMBEDDING_DTYPE", "auto")
    def test_auto_dtype(self):
        """Test auto dtype returns None."""
        dtype = _resolve_dtype()
        assert dtype is None

    @patch("src.model.EMBEDDING_DTYPE", "float16")
    def test_float16_dtype(self):
        """Test float16 dtype."""
        dtype = _resolve_dtype()
        assert dtype == torch.float16

    @patch("src.model.EMBEDDING_DTYPE", "bfloat16")
    def test_bfloat16_dtype(self):
        """Test bfloat16 dtype."""
        dtype = _resolve_dtype()
        assert dtype == torch.bfloat16

    @patch("src.model.EMBEDDING_DTYPE", "float32")
    def test_float32_dtype(self):
        """Test float32 dtype."""
        dtype = _resolve_dtype()
        assert dtype == torch.float32

    @patch("src.model.EMBEDDING_DTYPE", "invalid")
    def test_invalid_dtype(self):
        """Test invalid dtype returns None."""
        dtype = _resolve_dtype()
        assert dtype is None


class TestModelResources:
    """Tests for ModelResources dataclass."""

    def test_model_resources_creation(self):
        """Test ModelResources can be created."""
        mock_model = MagicMock()
        mock_tokenizer = MagicMock()

        resources = ModelResources(
            model=mock_model,
            tokenizer=mock_tokenizer,
            device=torch.device("cpu"),
            dtype=torch.float32,
            lock=Lock(),
        )

        assert resources.model is mock_model
        assert resources.tokenizer is mock_tokenizer
        assert resources.device == torch.device("cpu")
        assert resources.dtype == torch.float32


class TestEncodeTexts:
    """Tests for encode_texts function (with mocked model)."""

    @pytest.fixture
    def mock_resources(self):
        """Create mock model resources."""
        mock_model = MagicMock()
        mock_tokenizer = MagicMock()

        # Setup tokenizer return
        mock_tokenizer.return_value = {
            "input_ids": torch.ones(2, 10, dtype=torch.long),
            "attention_mask": torch.ones(2, 10, dtype=torch.long),
        }

        # Setup model return
        mock_output = MagicMock()
        mock_output.last_hidden_state = torch.randn(2, 10, 1024)
        mock_model.return_value = mock_output

        return ModelResources(
            model=mock_model,
            tokenizer=mock_tokenizer,
            device=torch.device("cpu"),
            dtype=None,
            lock=Lock(),
        )

    @patch("src.model.get_model")
    @patch("src.model.EMBEDDING_MAX_LENGTH", 8192)
    def test_encode_texts_basic(self, mock_get_model, mock_resources):
        """Test basic text encoding."""
        mock_get_model.return_value = mock_resources

        from src.model import encode_texts
        result = encode_texts(["text 1", "text 2"])

        assert result.shape[0] == 2  # batch size
        mock_resources.tokenizer.assert_called_once()

    @patch("src.model.get_model")
    def test_encode_texts_with_query_formatting(self, mock_get_model, mock_resources):
        """Test that queries are formatted with instruction."""
        mock_get_model.return_value = mock_resources

        from src.model import encode_texts
        encode_texts(["query"], is_query=True, instruction="Test instruction")

        # Check that tokenizer received formatted text
        call_args = mock_resources.tokenizer.call_args
        texts = call_args[0][0]
        assert "Instruct: Test instruction" in texts[0]
        assert "Query:query" in texts[0]

    @patch("src.model.get_model")
    def test_encode_texts_normalization(self, mock_get_model, mock_resources):
        """Test that embeddings are normalized when requested."""
        mock_get_model.return_value = mock_resources

        from src.model import encode_texts
        result = encode_texts(["text"], normalize=True)

        # Check embeddings are approximately unit norm
        norm = torch.norm(result, p=2, dim=1)
        assert torch.allclose(norm, torch.ones_like(norm), atol=1e-5)

    @patch("src.model.get_model")
    def test_encode_texts_dimension_truncation(self, mock_get_model, mock_resources):
        """Test that embeddings are truncated to requested dimension."""
        mock_get_model.return_value = mock_resources

        from src.model import encode_texts
        result = encode_texts(["text"], dimension=256, normalize=False)

        assert result.shape[1] == 256


class TestEncodeQueryAndDocuments:
    """Tests for encode_query and encode_documents functions."""

    @patch("src.model.encode_texts")
    def test_encode_query_calls_encode_texts(self, mock_encode):
        """Test encode_query calls encode_texts with is_query=True."""
        mock_encode.return_value = torch.randn(1, 1024)

        from src.model import encode_query
        encode_query("test query")

        mock_encode.assert_called_once()
        call_kwargs = mock_encode.call_args[1]
        assert call_kwargs["is_query"] is True

    @patch("src.model.encode_texts")
    def test_encode_documents_calls_encode_texts(self, mock_encode):
        """Test encode_documents calls encode_texts with is_query=False."""
        mock_encode.return_value = torch.randn(2, 1024)

        from src.model import encode_documents
        encode_documents(["doc 1", "doc 2"])

        mock_encode.assert_called_once()
        call_kwargs = mock_encode.call_args[1]
        assert call_kwargs["is_query"] is False

    @patch("src.model.encode_texts")
    def test_encode_query_with_custom_instruction(self, mock_encode):
        """Test encode_query passes custom instruction."""
        mock_encode.return_value = torch.randn(1, 1024)

        from src.model import encode_query
        encode_query("test", instruction="Custom instruction")

        call_kwargs = mock_encode.call_args[1]
        assert call_kwargs["instruction"] == "Custom instruction"
