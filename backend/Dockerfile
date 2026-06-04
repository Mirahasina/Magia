FROM python:3.10-slim

WORKDIR /app

# Copy requirements file (relative to repo root context)
COPY backend/requirements.txt .

# Install dependencies (using psycopg2-binary, so libpq-dev is not strictly needed,
# but we keep build-essential just in case)
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    && pip install --upgrade pip \
    && pip install --no-cache-dir -r requirements.txt \
    && apt-get purge -y --auto-remove build-essential \
    && rm -rf /var/lib/apt/lists/*

# Copy backend source code (relative to repo root context)
COPY backend/ .

# Collect static files
RUN python manage.py collectstatic --noinput || true

# Expose default port (Railway injects $PORT at runtime)
EXPOSE 8000

# Run database migrations then start Gunicorn on Railway's dynamic $PORT
CMD ["sh", "-c", "python manage.py migrate --noinput && gunicorn magia_backend.wsgi:application --bind 0.0.0.0:${PORT:-8000} --workers 2 --timeout 120"]
