# ---- Stage 1: Builder ----
FROM python:3.10-slim AS builder

WORKDIR /app

# Install system dependencies needed for building Python packages
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    libpq-dev \
    libffi-dev \
    libssl-dev \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Copy and install Python dependencies
COPY requirements.txt .
RUN pip install --upgrade pip && \
    pip install --no-cache-dir -r requirements.txt

# ---- Stage 2: Production ----
FROM python:3.10-slim

WORKDIR /app

# Install only runtime system dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    libpq5 \
    && rm -rf /var/lib/apt/lists/*

# Copy installed packages from builder
COPY --from=builder /usr/local/lib/python3.10/site-packages /usr/local/lib/python3.10/site-packages
COPY --from=builder /usr/local/bin /usr/local/bin

# Copy project source code
COPY . .

# Collect static files
RUN python manage.py collectstatic --noinput || true

# Expose default port (Railway injects $PORT at runtime)
EXPOSE 8000

# Run database migrations then start Gunicorn on Railway's dynamic $PORT
CMD ["sh", "-c", "python manage.py migrate --noinput && gunicorn magia_backend.wsgi:application --bind 0.0.0.0:${PORT:-8000} --workers 2 --timeout 120"]
