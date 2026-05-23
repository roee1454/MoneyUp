# =========================================================
# Stage 1: Build & Dependencies
# =========================================================
FROM node:22-bullseye AS builder

WORKDIR /workspace
RUN corepack enable

# Copy lockfile and workspace files
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./

# Copy the entire monorepo codebase
COPY . .

# Install dependencies (including devDeps for build)
RUN pnpm install --no-frozen-lockfile

# Build the scraper service
RUN npx nest build scraper-service

# =========================================================
# Stage 2: Runtime Scraper Image with Chromium
# =========================================================
FROM node:22-bullseye AS runner

# Install Chromium and required fonts/libraries
RUN apt-get update && apt-get install -y --no-install-recommends \
    chromium \
    fonts-freefont-ttf \
    fonts-kacst \
    fonts-thai-tlwg \
    libcap2 \
    sqlite3 \
    libsqlite3-0 \
    netcat-openbsd \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /workspace
RUN corepack enable

# Puppeteer environment variables
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium
ENV CI=true

# Copy built application and node_modules from builder
# We copy with --chown to avoid slow recursive chown at runtime
COPY --from=builder --chown=node:node /workspace /workspace

WORKDIR /workspace

USER node

EXPOSE 3002

CMD ["pnpm", "start", "scraper-service"]
