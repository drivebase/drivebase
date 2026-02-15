FROM oven/bun:1.2-alpine AS base

FROM base AS pruner
WORKDIR /app
COPY . .
RUN bunx turbo prune --scope=@drivebase/api --scope=web --docker

FROM base AS deps
WORKDIR /app
COPY --from=pruner /app/out/json/ .
COPY --from=pruner /app/out/bun.lock ./bun.lock
RUN bun install --frozen-lockfile --ignore-scripts

FROM deps AS builder
WORKDIR /app
COPY --from=pruner /app/out/full/ .
COPY biome.json README.md ./

# Build-time frontend API URL (defaults to same-origin proxy).
ARG VITE_PUBLIC_API_URL=/graphql
ENV VITE_PUBLIC_API_URL=${VITE_PUBLIC_API_URL}
RUN bun run --cwd apps/web build

FROM base AS runtime
WORKDIR /app

RUN apk add --no-cache caddy supervisor

COPY --from=deps /app/node_modules ./node_modules
COPY --from=builder /app/apps ./apps
COPY --from=builder /app/packages ./packages
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/turbo.json ./turbo.json

RUN bun run --cwd apps/api codegen

# Static frontend served by Caddy.
COPY --from=builder /app/apps/web/dist /srv/www

COPY docker/Caddyfile /etc/caddy/Caddyfile
COPY docker/supervisord.conf /etc/supervisord.conf
COPY docker/supervisor.d /etc/supervisor.d
COPY docker/start.sh /usr/local/bin/start.sh
RUN chmod +x /usr/local/bin/start.sh

ENV PORT=4000
ENV NODE_ENV=production
ENV CORS_ORIGIN=http://localhost:3000
ENV API_BASE_URL=http://localhost:3000
ENV API_UPSTREAM=http://127.0.0.1:4000

EXPOSE 3000

CMD ["/usr/local/bin/start.sh"]
