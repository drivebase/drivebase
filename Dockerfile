# syntax=docker/dockerfile:1

# ── Stage 1: prune workspace to only what api, workers, and web need ─────────
FROM oven/bun:1.3.5-alpine AS pruner
WORKDIR /app
COPY . .
RUN bunx turbo prune @drivebase/api @drivebase/workers web --docker

# ── Stage 2: install all deps ─────────────────────────────────────────────────
FROM oven/bun:1.3.5-alpine AS deps
WORKDIR /app
COPY --from=pruner /app/out/json/ .
COPY --from=pruner /app/out/bun.lock ./bun.lock
RUN bun install --ignore-scripts

# ── Stage 3: build web (static SPA) — skipped in CI builds ───────────────────
FROM deps AS web-builder
# Baked into the JS bundle at build time — set to your public host,
# e.g. https://drivebase.example.com. Leave empty to use same-origin
# relative paths (works when Caddy serves web and API on the same host).
ARG VITE_PUBLIC_API_URL=""
ENV VITE_PUBLIC_API_URL=${VITE_PUBLIC_API_URL}
COPY --from=pruner /app/out/full/ .
RUN cd apps/web && bun run build

# ── Stage 4: runtime base (shared by runtime and runtime-ci) ─────────────────
FROM oven/bun:1.3.5-alpine AS runtime-base
WORKDIR /app

ARG APP_VERSION="0.0.0"
ENV APP_VERSION=${APP_VERSION}

RUN apk add --no-cache caddy supervisor

COPY --from=pruner /app/out/full/ .
COPY --from=pruner /app/out/bun.lock ./bun.lock
RUN bun install --ignore-scripts --production --frozen-lockfile

COPY var/docker/supervisord.conf /etc/supervisord.conf
COPY var/docker/supervisor.d/ /etc/supervisor.d/
COPY var/docker/Caddyfile /etc/caddy/Caddyfile
COPY var/docker/entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

EXPOSE 80

# ── Stage 5: runtime — web built internally (local / self-hosted builds) ──────
FROM runtime-base AS runtime
COPY --from=web-builder /app/apps/web/dist ./apps/web/dist
ENTRYPOINT ["/entrypoint.sh"]

# ── Stage 6: runtime-ci — web pre-built externally and injected via named context ───
FROM runtime-base AS runtime-ci
COPY --from=web-dist . ./apps/web/dist
ENTRYPOINT ["/entrypoint.sh"]
