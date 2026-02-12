FROM oven/bun:1.2-alpine AS deps

WORKDIR /app

# Install dependencies first for better layer caching.
COPY package.json bun.lock turbo.json ./
COPY apps/api/package.json ./apps/api/package.json
COPY apps/web/package.json ./apps/web/package.json
COPY packages/core/package.json ./packages/core/package.json
COPY packages/db/package.json ./packages/db/package.json
COPY packages/google-drive/package.json ./packages/google-drive/package.json
COPY packages/local/package.json ./packages/local/package.json
COPY packages/s3/package.json ./packages/s3/package.json
COPY packages/utils/package.json ./packages/utils/package.json
RUN bun install --frozen-lockfile

FROM deps AS web-build

WORKDIR /app

COPY apps ./apps
COPY packages ./packages
COPY biome.json ./
COPY README.md ./

# Build-time frontend API URL (defaults to same-origin proxy).
ARG VITE_PUBLIC_API_URL=/graphql
ENV VITE_PUBLIC_API_URL=${VITE_PUBLIC_API_URL}
RUN bun run --cwd /app/apps/web build

FROM oven/bun:1.2-alpine AS runtime

WORKDIR /app

RUN apk add --no-cache caddy supervisor

COPY --from=deps /app/node_modules ./node_modules
COPY package.json bun.lock turbo.json ./
COPY apps/api ./apps/api
COPY packages ./packages

# Static frontend served by Caddy.
COPY --from=web-build /app/apps/web/dist /srv/www

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
