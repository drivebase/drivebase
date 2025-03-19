FROM node:22-alpine AS base

ENV NPM_CONFIG_UPDATE_NOTIFIER=false
ENV NEXT_TELEMETRY_DISABLED=1

WORKDIR /app

COPY package.json .
COPY pnpm-lock.yaml .

RUN npm i -g pnpm
RUN pnpm install --frozen-lockfile

COPY apps apps
COPY shared shared
COPY schema.prisma .
COPY nx.json tsconfig.base.json eslint.config.mjs jest.* /app/ 

RUN npm run db:generate
RUN npx nx run-many --target=build --projects=frontend,backend

FROM node:22-alpine AS runner

ARG APP_VERSION
ENV APP_VERSION=${APP_VERSION}
ENV NODE_ENV=production

RUN apk add --no-cache \
  caddy \
  supervisor

RUN npm i -g pnpm

WORKDIR /app

COPY --from=base /app/dist/apps .

WORKDIR /app/backend

COPY schema.prisma .

RUN pnpm install --frozen-lockfile --prod && \
  pnpm add tslib && \
  pnpm store prune && \
  npx prisma generate && \
  npm cache clean --force && \
  rm -rf /root/.cache && \
  rm -rf /root/.npm

COPY scripts scripts
COPY migrations migrations
COPY var/docker/entrypoint.sh .

EXPOSE 7337

WORKDIR /app

COPY var/docker/Caddyfile .
COPY var/docker/supervisord.conf /etc/supervisord.conf
COPY var/docker/supervisord /app/supervisord

WORKDIR /app/backend

RUN chmod +x entrypoint.sh

CMD ["./entrypoint.sh"]
