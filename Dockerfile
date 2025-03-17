FROM node:22-alpine AS base

WORKDIR /app

COPY package.json .
COPY pnpm-lock.yaml .

RUN npm i -g pnpm
RUN pnpm install --frozen-lockfile

COPY . .

RUN npm run db:generate
RUN npx nx run-many --target=build --projects=frontend,backend

FROM node:22-alpine AS runner

ARG APP_VERSION
ENV APP_VERSION=${APP_VERSION}
ENV NODE_ENV=production

WORKDIR /app

RUN npm i -g pnpm

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

EXPOSE 8000

RUN chmod +x entrypoint.sh

CMD ["./entrypoint.sh"]
