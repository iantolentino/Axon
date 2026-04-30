# ─────────────────────────────────────────────
# Stage 1: dependency builder
# ─────────────────────────────────────────────
FROM python:3.11-slim AS builder

WORKDIR /build

# Install build deps
RUN apt-get update && apt-get install -y --no-install-recommends \
        gcc \
        libffi-dev \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir --prefix=/install -r requirements.txt

# ─────────────────────────────────────────────
# Stage 2: runtime image
# ─────────────────────────────────────────────
FROM python:3.11-slim AS runtime

LABEL org.opencontainers.image.title="Axon"
LABEL org.opencontainers.image.description="Personal Memory & Productivity App"
LABEL org.opencontainers.image.source="https://github.com/$GITHUB_REPOSITORY"

# Runtime environment
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    FLASK_ENV=production \
    PORT=5000 \
    PYTHONPATH=/app

WORKDIR /app

# Copy installed packages from builder
COPY --from=builder /install /usr/local

# Install curl for health check only (tiny)
RUN apt-get update && apt-get install -y --no-install-recommends curl \
    && rm -rf /var/lib/apt/lists/*

# Copy application code
COPY . .

# Create a persistent data directory for SQLite
RUN mkdir -p /app/data /app/instance

# Create non-root user and fix permissions
RUN useradd --no-create-home --shell /bin/false axon \
    && chown -R axon:axon /app

USER axon

EXPOSE 5000

# Health check — uses the /health endpoint in app.py
HEALTHCHECK --interval=30s --timeout=10s --start-period=10s --retries=3 \
    CMD curl -f http://localhost:5000/health || exit 1

# Gunicorn as WSGI server — config in gunicorn.conf.py
CMD ["gunicorn", "--config", "gunicorn.conf.py", "app:app"]
