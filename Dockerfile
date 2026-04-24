# syntax=docker/dockerfile:1

# ── Stage 1: prune workspace to only what api, workers, and web need ─────────
FROM oven/bun:1.3.5-alpine AS pruner
WORKDIR /app
COPY . .
RUN bunx turbo prune @drivebase/api @drivebase/workers web --docker

# ── Stage 2: install all deps (needed for web build + codegen) ───────────────
FROM oven/bun:1.3.5-alpine AS deps
WORKDIR /app
COPY --from=pruner /app/out/json/ .
COPY --from=pruner /app/out/bun.lock ./bun.lock
RUN bun install --ignore-scripts

# ── Stage 3: build web (static SPA) ─────────────────────────────────────────
FROM deps AS web-builder
# Baked into the JS bundle at build time — set to your public host,
# e.g. https://drivebase.example.com. Leave empty to use same-origin
# relative paths (works when Caddy serves web and API on the same host).
ARG VITE_PUBLIC_API_URL=""
ENV VITE_PUBLIC_API_URL=${VITE_PUBLIC_API_URL}
COPY --from=pruner /app/out/full/ .
RUN cd apps/web && bun run build

# ── Stage 4: production deps (api + workers only, no devDependencies) ────────
FROM oven/bun:1.3.5-alpine AS prod-deps
WORKDIR /app
COPY --from=pruner /app/out/json/ .
COPY --from=pruner /app/out/bun.lock ./bun.lock
RUN bun install --ignore-scripts --production --frozen-lockfile

# ── Stage 5: runtime ─────────────────────────────────────────────────────────
FROM oven/bun:1.3.5-alpine AS runtime
WORKDIR /app

RUN apk add --no-cache caddy supervisor

# Production node_modules only
COPY --from=prod-deps /app/node_modules ./node_modules

# Pruned source (api + workers run directly via bun)
COPY --from=pruner /app/out/full/ .

# Pre-built web static files
COPY --from=web-builder /app/apps/web/dist ./apps/web/dist

# Runtime support files
COPY var/docker/supervisord.conf /etc/supervisord.conf
COPY var/docker/supervisor.d/ /etc/supervisor.d/
COPY var/docker/Caddyfile /etc/caddy/Caddyfile
COPY var/docker/entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

EXPOSE 80

ENTRYPOINT ["/entrypoint.sh"]
