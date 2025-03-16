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

WORKDIR /app

RUN npm i -g pnpm

COPY --from=base /app/dist/apps .
COPY shared/internal/src/schema.prisma backend/

WORKDIR /app/backend

RUN pnpm install --frozen-lockfile --prod && \
  pnpm add tslib && \
  pnpm store prune && \
  npx prisma generate && \
  npm cache clean --force && \
  rm -rf /root/.cache && \
  rm -rf /root/.npm

EXPOSE 8000

CMD ["node", "main.js"]
