"""
Tests for the LLM server endpoints.
"""
import pytest


class TestHealthEndpoint:
    """Tests for /health endpoint."""

    def test_health_returns_ok_when_ready(self, client):
        """Health check returns ok status when model is loaded."""
        response = client.get("/health")

        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "ok"
        assert data["model"] == "mock-model"
        assert data["model_loaded"] is True

    def test_health_returns_loading_when_not_ready(self, client_not_ready):
        """Health check returns loading status when model not ready."""
        response = client_not_ready.get("/health")

        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "loading"
        assert data["model_loaded"] is False


class TestChatCompletionsEndpoint:
    """Tests for /v1/chat/completions endpoint."""

    def test_chat_completion_success(self, client, mock_llm_service):
        """Chat completion returns expected response."""
        mock_llm_service.set_response("Hello! How can I help you?")

        response = client.post(
            "/v1/chat/completions",
            json={
                "messages": [
                    {"role": "system", "content": "You are helpful."},
                    {"role": "user", "content": "Hi"},
                ],
                "max_tokens": 256,
                "temperature": 0.5,
            },
        )

        assert response.status_code == 200
        data = response.json()
        assert data["object"] == "chat.completion"
        assert data["model"] == "mock-model"
        assert len(data["choices"]) == 1
        assert data["choices"][0]["message"]["role"] == "assistant"
        assert data["choices"][0]["message"]["content"] == "Hello! How can I help you?"
        assert data["choices"][0]["finish_reason"] == "stop"

    def test_chat_completion_passes_parameters(self, client, mock_llm_service):
        """Chat completion passes correct parameters to service."""
        client.post(
            "/v1/chat/completions",
            json={
                "messages": [{"role": "user", "content": "Test"}],
                "max_tokens": 100,
                "temperature": 0.3,
                "top_p": 0.8,
            },
        )

        calls = mock_llm_service.get_calls()
        assert len(calls) == 1
        assert calls[0]["messages"] == [{"role": "user", "content": "Test"}]
        assert calls[0]["max_new_tokens"] == 100
        assert calls[0]["temperature"] == 0.3
        assert calls[0]["top_p"] == 0.8

    def test_chat_completion_returns_503_when_not_ready(self, client_not_ready):
        """Chat completion returns 503 when model not ready."""
        response = client_not_ready.post(
            "/v1/chat/completions",
            json={
                "messages": [{"role": "user", "content": "Hi"}],
            },
        )

        assert response.status_code == 503
        assert "not ready" in response.json()["detail"].lower()

    def test_chat_completion_validates_temperature_range(self, client):
        """Chat completion validates temperature is within range."""
        response = client.post(
            "/v1/chat/completions",
            json={
                "messages": [{"role": "user", "content": "Hi"}],
                "temperature": 3.0,  # Invalid: > 2.0
            },
        )

        assert response.status_code == 422  # Validation error

    def test_chat_completion_validates_top_p_range(self, client):
        """Chat completion validates top_p is within range."""
        response = client.post(
            "/v1/chat/completions",
            json={
                "messages": [{"role": "user", "content": "Hi"}],
                "top_p": 1.5,  # Invalid: > 1.0
            },
        )

        assert response.status_code == 422  # Validation error

    def test_chat_completion_requires_messages(self, client):
        """Chat completion requires messages field."""
        response = client.post(
            "/v1/chat/completions",
            json={},
        )

        assert response.status_code == 422  # Validation error
