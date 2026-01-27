"""
Model loading and LLM service with dependency injection support.
"""
import logging
from dataclasses import dataclass
from threading import Lock, Thread
from typing import Iterator, Optional, Protocol

import torch
from transformers import AutoTokenizer, AutoModelForCausalLM, TextIteratorStreamer

from src.config import (
    LLM_MODEL_PATH,
    LLM_MODEL_NAME,
    LLM_DEVICE,
    LLM_DTYPE,
    LLM_MAX_NEW_TOKENS,
    LLM_MAX_INPUT_LENGTH,
    DEFAULT_TEMPERATURE,
    DEFAULT_TOP_P,
    USE_FLASH_ATTENTION,
)

logger = logging.getLogger(__name__)


class LLMServiceProtocol(Protocol):
    """Protocol for LLM service - enables dependency injection and testing."""

    def generate(
        self,
        messages: list[dict],
        max_new_tokens: int = LLM_MAX_NEW_TOKENS,
        temperature: float = DEFAULT_TEMPERATURE,
        top_p: float = DEFAULT_TOP_P,
    ) -> str:
        """Generate a chat completion response."""
        ...

    def generate_stream(
        self,
        messages: list[dict],
        max_new_tokens: int = LLM_MAX_NEW_TOKENS,
        temperature: float = DEFAULT_TEMPERATURE,
        top_p: float = DEFAULT_TOP_P,
    ) -> Iterator[str]:
        """Generate a streaming chat completion response."""
        ...

    @property
    def model_name(self) -> str:
        """Return the model name."""
        ...

    @property
    def is_ready(self) -> bool:
        """Return whether the model is loaded and ready."""
        ...


@dataclass
class ModelConfig:
    """Configuration for model loading."""
    model_path: str = LLM_MODEL_PATH
    model_name: str = LLM_MODEL_NAME
    device: str = LLM_DEVICE
    dtype: str = LLM_DTYPE
    max_input_length: int = LLM_MAX_INPUT_LENGTH
    use_flash_attention: bool = USE_FLASH_ATTENTION


class LLMService:
    """
    LLM service for chat completions.

    Supports dependency injection - pass model and tokenizer directly for testing,
    or use load_model() to load from disk.
    """

    def __init__(
        self,
        model: Optional[AutoModelForCausalLM] = None,
        tokenizer: Optional[AutoTokenizer] = None,
        config: Optional[ModelConfig] = None,
    ):
        """
        Initialize LLM service.

        Args:
            model: Pre-loaded model (for testing/injection)
            tokenizer: Pre-loaded tokenizer (for testing/injection)
            config: Model configuration
        """
        self._model = model
        self._tokenizer = tokenizer
        self._config = config or ModelConfig()
        self._device: Optional[torch.device] = None
        self._lock = Lock()
        self._ready = model is not None and tokenizer is not None

    @property
    def model_name(self) -> str:
        return self._config.model_name

    @property
    def is_ready(self) -> bool:
        return self._ready

    def _resolve_device(self) -> torch.device:
        """Resolve the device to use for the model."""
        if self._config.device == "auto":
            return torch.device("cuda" if torch.cuda.is_available() else "cpu")
        return torch.device(self._config.device)

    def _resolve_dtype(self) -> Optional[torch.dtype]:
        """Resolve the dtype to use for the model."""
        if self._config.dtype == "auto":
            return None
        return getattr(torch, self._config.dtype, None)

    def load_model(self) -> None:
        """
        Load the model from disk.

        Thread-safe - can be called from background thread.
        """
        if self._ready:
            return

        with self._lock:
            if self._ready:
                return

            self._device = self._resolve_device()
            dtype = self._resolve_dtype()

            logger.info(
                "Loading LLM model from %s (%s)",
                self._config.model_path,
                self._config.model_name,
            )

            self._tokenizer = AutoTokenizer.from_pretrained(
                self._config.model_path,
                local_files_only=True,
            )

            model_kwargs = {"local_files_only": True}
            if dtype is not None:
                model_kwargs["torch_dtype"] = dtype
            if self._config.use_flash_attention:
                model_kwargs["attn_implementation"] = "flash_attention_2"
                logger.info("Flash Attention 2 enabled")

            self._model = AutoModelForCausalLM.from_pretrained(
                self._config.model_path,
                **model_kwargs,
            )
            self._model = self._model.to(self._device)
            self._model.eval()

            self._ready = True
            logger.info("LLM model loaded on %s", self._device)

    def _prepare_inputs(self, messages: list[dict]) -> dict:
        """Prepare model inputs from messages."""
        text = self._tokenizer.apply_chat_template(
            messages,
            tokenize=False,
            add_generation_prompt=True,
        )
        return self._tokenizer(
            [text],
            return_tensors="pt",
            truncation=True,
            max_length=self._config.max_input_length,
        ).to(self._device)

    def _get_generation_kwargs(
        self,
        model_inputs: dict,
        max_new_tokens: int,
        temperature: float,
        top_p: float,
    ) -> dict:
        """Build generation kwargs."""
        kwargs = {
            **model_inputs,
            "max_new_tokens": max_new_tokens,
            "pad_token_id": self._tokenizer.eos_token_id,
        }
        if temperature > 0:
            kwargs["temperature"] = temperature
            kwargs["top_p"] = top_p
            kwargs["do_sample"] = True
        else:
            kwargs["do_sample"] = False
        return kwargs

    def generate(
        self,
        messages: list[dict],
        max_new_tokens: int = LLM_MAX_NEW_TOKENS,
        temperature: float = DEFAULT_TEMPERATURE,
        top_p: float = DEFAULT_TOP_P,
    ) -> str:
        """
        Generate a chat completion response.

        Args:
            messages: List of message dicts with 'role' and 'content' keys
            max_new_tokens: Maximum tokens to generate
            temperature: Sampling temperature (0.0-2.0)
            top_p: Nucleus sampling parameter

        Returns:
            Generated response text

        Raises:
            RuntimeError: If model is not loaded
        """
        if not self._ready:
            raise RuntimeError("Model not loaded. Call load_model() first.")

        model_inputs = self._prepare_inputs(messages)
        generation_kwargs = self._get_generation_kwargs(
            model_inputs, max_new_tokens, temperature, top_p
        )

        with self._lock:
            with torch.no_grad():
                generated_ids = self._model.generate(**generation_kwargs)

        # Extract only the new tokens (exclude input)
        input_length = model_inputs.input_ids.shape[1]
        generated_ids = generated_ids[:, input_length:]

        response = self._tokenizer.batch_decode(
            generated_ids,
            skip_special_tokens=True,
        )[0]

        return response.strip()

    def generate_stream(
        self,
        messages: list[dict],
        max_new_tokens: int = LLM_MAX_NEW_TOKENS,
        temperature: float = DEFAULT_TEMPERATURE,
        top_p: float = DEFAULT_TOP_P,
    ) -> Iterator[str]:
        """
        Generate a streaming chat completion response.

        Yields tokens as they are generated for real-time streaming.

        Args:
            messages: List of message dicts with 'role' and 'content' keys
            max_new_tokens: Maximum tokens to generate
            temperature: Sampling temperature (0.0-2.0)
            top_p: Nucleus sampling parameter

        Yields:
            Generated tokens as strings

        Raises:
            RuntimeError: If model is not loaded
        """
        if not self._ready:
            raise RuntimeError("Model not loaded. Call load_model() first.")

        model_inputs = self._prepare_inputs(messages)

        # Create streamer that yields tokens as they're generated
        streamer = TextIteratorStreamer(
            self._tokenizer,
            skip_prompt=True,
            skip_special_tokens=True,
        )

        generation_kwargs = self._get_generation_kwargs(
            model_inputs, max_new_tokens, temperature, top_p
        )
        generation_kwargs["streamer"] = streamer

        # Run generation in background thread
        def generate_in_thread():
            with self._lock:
                with torch.no_grad():
                    self._model.generate(**generation_kwargs)

        thread = Thread(target=generate_in_thread)
        thread.start()

        # Yield tokens as they come from the streamer
        for token in streamer:
            if token:
                yield token

        thread.join()


def create_llm_service(config: Optional[ModelConfig] = None) -> LLMService:
    """
    Factory function to create an LLMService instance.

    Args:
        config: Optional model configuration

    Returns:
        New LLMService instance (model not yet loaded)
    """
    return LLMService(config=config)
