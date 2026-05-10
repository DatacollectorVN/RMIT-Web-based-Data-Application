FROM python:3.11-slim
WORKDIR /app

ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

# Install uv
RUN pip install --no-cache-dir uv

# Copy dependency manifest and lockfile first for layer caching.
COPY pyproject.toml uv.lock ./

# Install all dependencies from the frozen lockfile (no package build).
RUN uv sync --frozen --no-dev

# Copy application source.
COPY . .

EXPOSE 8080
CMD ["uv", "run", "uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8080"]
