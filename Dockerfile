# =========================================================
# Multi-Stage Dockerfile for EduSphere LMS Production Web App
# Stage 1: Build React Frontend
# Stage 2: FastApi Python Backend + Static File Host
# =========================================================

# --- Stage 1: Frontend Build ---
FROM node:20-alpine AS frontend-builder
WORKDIR /app
COPY package*.json ./
RUN npm ci --silent
COPY . .
RUN npm run build

# --- Stage 2: Production Python Backend & Web Server ---
FROM python:3.11-slim
WORKDIR /app

# Install system dependencies (pyodbc, unixodbc, PostgreSQL drivers)
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    libpq-dev \
    unixodbc-dev \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Install Python requirements
COPY server/requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt gunicorn uvicorn

# Copy backend code
COPY server /app/server
COPY --from=frontend-builder /app/dist /app/dist

# Set Environment Variables
ENV PYTHONUNBUFFERED=1
ENV ENVIRONMENT=production

# Start Production Server with Gunicorn + Uvicorn Workers dynamically bound to Render's $PORT
CMD ["sh", "-c", "gunicorn server.main:app -w 2 -k uvicorn.workers.UvicornWorker -b 0.0.0.0:${PORT:-8000} --timeout 120"]

