# =========================================================
# Stage 1: Build & Dependencies
# =========================================================
FROM node:22-bullseye AS builder

# Install build dependencies for better-sqlite3
RUN apt-get update && apt-get install -y --no-install-recommends python3 make g++ sqlite3 libsqlite3-dev ca-certificates && rm -rf /var/lib/apt/lists/*

WORKDIR /workspace

# Enable corepack and pnpm
RUN corepack enable

# Copy lockfile and workspace files
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./

# Copy the entire monorepo codebase first so pnpm can find all workspace package.jsons
COPY . .

# Install dependencies once securely inside the image
RUN pnpm install --no-frozen-lockfile

# Build all NestJS apps
RUN npx nest build ai-service && \
    npx nest build auth-service && \
    npx nest build scraper-service && \
    npx nest build users-service && \
    npx nest build gateway

# =========================================================
# Stage 2: Runtime Production/Development Image
# =========================================================
FROM node:22-bullseye AS runner

# Set working directory
WORKDIR /workspace

# Install runtime SQLite library, netcat for healthchecks, and enable corepack (for pnpm binary)
RUN apt-get update && apt-get install -y --no-install-recommends sqlite3 libsqlite3-0 netcat-openbsd && rm -rf /var/lib/apt/lists/*

RUN corepack enable

# Copy built application from builder
COPY --from=builder /workspace /workspace

# Force corepack to download and cache pnpm based on package.json packageManager field
RUN pnpm --version

EXPOSE 3000 3001 3002 3003 3004 5173
