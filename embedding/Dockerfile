# Embedding Service Dockerfile
# Uses NVIDIA NGC PyTorch image with flash-attn for Qwen3-Embedding-0.6B

FROM nvcr.io/nvidia/pytorch:25.12-py3

# Install system dependencies
RUN apt-get update && apt-get install -y \
    curl \
    git \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy dependency files
COPY pyproject.toml ./

# Install build dependencies
RUN pip install --no-cache-dir hatchling setuptools wheel

# Install project dependencies
RUN pip install --no-cache-dir ".[all]" --no-build-isolation

# Install Flash Attention from source (must match installed PyTorch version)
# MAX_JOBS limits parallel compilation to avoid OOM during build
RUN MAX_JOBS=8 pip install flash-attn --no-build-isolation --no-cache-dir

# Prevent HuggingFace from downloading models during runtime
ENV HF_HUB_OFFLINE=1
ENV TRANSFORMERS_OFFLINE=1

# Copy source code
COPY src/ ./src/

# Environment variables
ENV PYTHONPATH=/app
ENV EMBEDDING_MODEL_PATH=/app/models/qwen3-embedding-0.6b
ENV EMBEDDING_HOST=0.0.0.0
ENV EMBEDDING_PORT=8001

# Expose HTTP port
EXPOSE 8001

# Run the server
CMD ["python", "-u", "-m", "src"]
