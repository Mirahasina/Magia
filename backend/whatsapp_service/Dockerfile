# Dockerfile for WhatsApp Node.js microservice
FROM node:20-slim

WORKDIR /app

# Install system dependencies required by Puppeteer / Chromium (used by whatsapp-web.js)
RUN apt-get update && apt-get install -y --no-install-recommends \
    chromium \
    libnss3 \
    libatk-bridge2.0-0 \
    libdrm2 \
    libxkbcommon0 \
    libgbm1 \
    libasound2 \
    libxshmfence1 \
    fonts-liberation \
    ca-certificates \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Tell Puppeteer to skip downloading Chromium (we use the system one)
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium

# Copy package files first for cache efficiency
COPY package.json package-lock.json* ./

# Install Node.js dependencies (skip dev deps in production)
RUN npm ci --omit=dev

# Copy application source
COPY . .

# Expose the microservice port
EXPOSE 3000

CMD ["node", "index.js"]
