FROM oven/bun:1.2-alpine AS base

# Prune for full build (api + web)
FROM base AS pruner
WORKDIR /app
COPY . .
RUN bunx turbo prune --scope=api --scope=web --docker

FROM base AS deps
WORKDIR /app
COPY --from=pruner /app/out/json/ .
COPY --from=pruner /app/out/bun.lock ./bun.lock
RUN bun install --frozen-lockfile --ignore-scripts

FROM deps AS builder
WORKDIR /app
COPY --from=pruner /app/out/full/ .
ARG BUILD_WEB=true
RUN bun run --cwd apps/api codegen && if [ "$BUILD_WEB" = "true" ]; then bun run --cwd apps/web build; fi

# Production deps for API only — prune web from workspaces so its packages are never installed
FROM base AS prod-deps
WORKDIR /app
COPY . .
RUN bunx turbo prune --scope=api --docker && \
    bun --eval "const f='out/json/package.json'; const p=JSON.parse(await Bun.file(f).text()); p.workspaces=p.workspaces.filter(w=>w!=='apps/web'); await Bun.write(f, JSON.stringify(p,null,2));" && \
    cd out/json && bun install --ignore-scripts --production

FROM base AS runtime-base
WORKDIR /app

RUN apk add --no-cache caddy supervisor

COPY --from=prod-deps /app/out/json/node_modules ./node_modules
COPY --from=builder /app/apps/api ./apps/api
COPY --from=builder /app/packages ./packages
COPY --from=builder /app/package.json ./package.json

COPY docker/Caddyfile /etc/caddy/Caddyfile
COPY docker/supervisord.conf /etc/supervisord.conf
COPY docker/supervisor.d /etc/supervisor.d
COPY docker/start.sh /usr/local/bin/start.sh
RUN chmod +x /usr/local/bin/start.sh

ENV PORT=4000
ENV NODE_ENV=production
ENV APP_URL=http://localhost:8900
ENV API_UPSTREAM=http://127.0.0.1:4000

EXPOSE 8900

FROM runtime-base AS runtime-local
COPY --from=builder /app/apps/web/dist /srv/www

FROM runtime-base AS runtime-ci
COPY apps/web/dist /srv/www
CMD ["/usr/local/bin/start.sh"]

FROM runtime-local AS runtime
CMD ["/usr/local/bin/start.sh"]
