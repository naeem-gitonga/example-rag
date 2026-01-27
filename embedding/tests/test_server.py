"""
Unit tests for FastAPI server endpoints.

These tests use FastAPI's TestClient to test the API without a real model.
"""
import pytest
from unittest.mock import patch, MagicMock
from threading import Event

import torch
from fastapi.testclient import TestClient


# Mock the model before importing server
@pytest.fixture(autouse=True)
def mock_model():
    """Mock model loading for all tests."""
    mock_resources = MagicMock()
    mock_resources.device = torch.device("cpu")
    mock_resources.dtype = None

    with patch("src.server.get_model", return_value=mock_resources):
        with patch("src.server.model_ready", Event()) as mock_ready:
            mock_ready.set()  # Model is ready
            yield mock_ready


@pytest.fixture
def client(mock_model):
    """Create test client."""
    from src.server import app
    return TestClient(app)


class TestHealthEndpoint:
    """Tests for /health endpoint."""

    def test_health_returns_ok(self, client):
        """Test health endpoint returns status."""
        response = client.get("/health")

        assert response.status_code == 200
        data = response.json()
        assert data["status"] in ["ok", "loading"]
        assert "model" in data
        assert "default_dimension" in data

    def test_health_includes_model_info(self, client):
        """Test health endpoint includes model information."""
        response = client.get("/health")

        data = response.json()
        assert "model_loaded" in data
        assert "default_instruction" in data


class TestEmbedEndpoint:
    """Tests for /embed endpoint."""

    @patch("src.server.encode_texts")
    def test_embed_single_text(self, mock_encode, client):
        """Test embedding a single text."""
        mock_encode.return_value = torch.randn(1, 1024)

        response = client.post("/embed", json={
            "text": "Hello world",
        })

        assert response.status_code == 200
        data = response.json()
        assert "embeddings" in data
        assert len(data["embeddings"]) == 1
        mock_encode.assert_called_once()

    @patch("src.server.encode_texts")
    def test_embed_batch_texts(self, mock_encode, client):
        """Test embedding multiple texts."""
        mock_encode.return_value = torch.randn(3, 1024)

        response = client.post("/embed", json={
            "text": ["Text 1", "Text 2", "Text 3"],
        })

        assert response.status_code == 200
        data = response.json()
        assert len(data["embeddings"]) == 3

    @patch("src.server.encode_texts")
    def test_embed_as_query(self, mock_encode, client):
        """Test embedding with is_query=true."""
        mock_encode.return_value = torch.randn(1, 1024)

        response = client.post("/embed", json={
            "text": "What is AI?",
            "is_query": True,
        })

        assert response.status_code == 200
        # Verify is_query was passed through
        call_kwargs = mock_encode.call_args
        assert call_kwargs[1]["is_query"] is True

    @patch("src.server.encode_texts")
    def test_embed_custom_dimension(self, mock_encode, client):
        """Test embedding with custom dimension."""
        mock_encode.return_value = torch.randn(1, 256)

        response = client.post("/embed", json={
            "text": "Test",
            "dimension": 256,
        })

        assert response.status_code == 200
        data = response.json()
        assert data["dimension"] == 256

    @patch("src.server.encode_texts")
    def test_embed_custom_instruction(self, mock_encode, client):
        """Test embedding with custom instruction."""
        mock_encode.return_value = torch.randn(1, 1024)

        response = client.post("/embed", json={
            "text": "Find code",
            "is_query": True,
            "instruction": "Search for code snippets",
        })

        assert response.status_code == 200
        call_kwargs = mock_encode.call_args
        assert call_kwargs[1]["instruction"] == "Search for code snippets"


class TestQueryEndpoint:
    """Tests for /embed/query endpoint."""

    @patch("src.server.encode_query")
    def test_embed_query(self, mock_encode, client):
        """Test query embedding endpoint."""
        mock_encode.return_value = torch.randn(1, 1024)

        response = client.post("/embed/query", json={
            "query": "What is machine learning?",
        })

        assert response.status_code == 200
        data = response.json()
        assert "embedding" in data
        assert isinstance(data["embedding"], list)

    @patch("src.server.encode_query")
    def test_embed_query_with_instruction(self, mock_encode, client):
        """Test query embedding with custom instruction."""
        mock_encode.return_value = torch.randn(1, 512)

        response = client.post("/embed/query", json={
            "query": "Python async",
            "instruction": "Find programming tutorials",
            "dimension": 512,
        })

        assert response.status_code == 200
        call_kwargs = mock_encode.call_args
        assert call_kwargs[1]["instruction"] == "Find programming tutorials"
        assert call_kwargs[1]["dimension"] == 512


class TestDocumentsEndpoint:
    """Tests for /embed/documents endpoint."""

    @patch("src.server.encode_documents")
    def test_embed_documents(self, mock_encode, client):
        """Test documents embedding endpoint."""
        mock_encode.return_value = torch.randn(2, 1024)

        response = client.post("/embed/documents", json={
            "documents": ["Doc 1", "Doc 2"],
        })

        assert response.status_code == 200
        data = response.json()
        assert "embeddings" in data
        assert len(data["embeddings"]) == 2
        assert data["count"] == 2

    @patch("src.server.encode_documents")
    def test_embed_documents_custom_params(self, mock_encode, client):
        """Test documents embedding with custom parameters."""
        mock_encode.return_value = torch.randn(3, 128)

        response = client.post("/embed/documents", json={
            "documents": ["A", "B", "C"],
            "normalize": False,
            "dimension": 128,
        })

        assert response.status_code == 200
        data = response.json()
        assert data["normalized"] is False
        assert data["dimension"] == 128


class TestRequestValidation:
    """Tests for request validation."""

    def test_embed_missing_text(self, client):
        """Test that missing text returns validation error."""
        response = client.post("/embed", json={})

        assert response.status_code == 422  # Validation error

    def test_query_missing_query(self, client):
        """Test that missing query returns validation error."""
        response = client.post("/embed/query", json={})

        assert response.status_code == 422

    def test_documents_missing_documents(self, client):
        """Test that missing documents returns validation error."""
        response = client.post("/embed/documents", json={})

        assert response.status_code == 422

    def test_documents_empty_list(self, client):
        """Test embedding empty documents list."""
        # This should be allowed - returns empty embeddings
        with patch("src.server.encode_documents") as mock_encode:
            mock_encode.return_value = torch.empty(0, 1024)

            response = client.post("/embed/documents", json={
                "documents": [],
            })

            assert response.status_code == 200
            data = response.json()
            assert data["count"] == 0
