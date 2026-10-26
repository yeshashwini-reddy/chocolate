# ==============================================================================
# MADHURI'S CHOCO HEAVEN - MULTI-STAGE DOCKERFILE FOR RENDER
# ==============================================================================
#
# Stage 1: Build the optimized static frontend bundle using Vite
# Stage 2: Minimal, secure Node.js runtime serving assets via zero-dependency server.js
#
# Features:
# - Multi-stage build minimizes final image size (~45MB)
# - Runs as unprivileged 'node' user for container security
# - Listens on 0.0.0.0:${PORT:-10000} (respects Render dynamic PORT assignment)
# - Built-in health check for Render zero-downtime deployment monitoring
# - Native graceful shutdown on SIGTERM / SIGINT
# ==============================================================================

# ------------------------------------------------------------------------------
# STAGE 1: BUILDER
# ------------------------------------------------------------------------------
FROM node:20-alpine AS builder

WORKDIR /app

# Build arguments for public client-side environment variables
# (Vite bakes VITE_* variables into the client bundle at build time)
ARG VITE_SUPABASE_URL
ARG VITE_SUPABASE_PUBLISHABLE_KEY
ARG VITE_RAZORPAY_KEY_ID

ENV VITE_SUPABASE_URL=${VITE_SUPABASE_URL}
ENV VITE_SUPABASE_PUBLISHABLE_KEY=${VITE_SUPABASE_PUBLISHABLE_KEY}
ENV VITE_RAZORPAY_KEY_ID=${VITE_RAZORPAY_KEY_ID}

# Install all dependencies (including devDependencies like Vite) needed to build the frontend.
# We explicitly use --include=dev so build tools are never omitted even if NODE_ENV=production is set.
COPY package.json package-lock.json ./
RUN npm ci --include=dev

# Copy application source code
COPY . .

# Build the production frontend distribution into /app/dist (Vite bundles in production mode by default)
RUN npm run build

# ------------------------------------------------------------------------------
# STAGE 2: PRODUCTION RUNNER
# ------------------------------------------------------------------------------
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=10000

# Install wget for lightweight health checking (already in alpine)
RUN apk --no-cache add wget

# Copy only the compiled distribution and server runner from the builder stage
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/server.js ./server.js
COPY --from=builder /app/package.json ./package.json

# Run as non-root unprivileged node user
USER node

# Expose Render default web service port
EXPOSE 10000

# Native container healthcheck
HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
  CMD wget -qO- http://127.0.0.1:${PORT:-10000}/healthz || exit 1

# Start the production web server
CMD ["node", "server.js"]
