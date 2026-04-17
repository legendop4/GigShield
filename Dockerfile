# ─────────────────────────────────────────────
# GigShield AI — Unified Production Monolith
# Optimized for Hugging Face Spaces (UID 1000)
# ─────────────────────────────────────────────

# STAGE 1: Build React Frontend
FROM node:20-alpine AS frontend-build
WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm install
COPY frontend/ ./
RUN npm run build

# STAGE 2: Final Monolith Container
FROM node:20-alpine

# Install system dependencies (Nginx, Supervisor, DNS Compat)
RUN apk add --no-cache nginx supervisor libc6-compat gcompat

WORKDIR /app

# 1. Install Unified Dependencies (Root)
# Merged all backend, trigger-engine, and shared dependencies here
COPY package*.json ./
RUN npm install --omit=dev

# 2. Copy All Source Code (Backend, Trigger, Shared)
COPY . .

# 3. Populate Frontend Build
RUN rm -rf /usr/share/nginx/html/*
COPY --from=frontend-build /app/frontend/dist /usr/share/nginx/html

# 4. Configure Services
COPY supervisord.conf /etc/supervisord.conf
COPY frontend/nginx.hf.conf /etc/nginx/http.d/default.conf

# 5. Hugging Face Permissions (Run as UID 1000)
RUN mkdir -p /var/lib/nginx /var/log/nginx /run/nginx /tmp/supervisor /app/shared && \
    chown -R 1000:1000 /app /usr/share/nginx/html /var/lib/nginx /var/log/nginx /run/nginx /tmp

USER 1000
EXPOSE 7860

# Start all processes via Supervisor
CMD ["/usr/bin/supervisord", "-c", "/etc/supervisord.conf"]
