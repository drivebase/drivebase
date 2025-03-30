FROM node:22-alpine AS base

# Install build dependencies
RUN apk add --no-cache python3 make g++

# Set working directory
WORKDIR /app

# Copy package files
RUN mkdir -p /app/web
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY web/package.json ./web

# Install dependencies
RUN npm i -g pnpm@9 && \
  pnpm install

# Copy the rest of the application
COPY . .

# Build the application
RUN pnpm run build && \
  pnpm prune --production && \
  pnpm store prune

FROM node:22-alpine AS runner

# Install nginx
RUN apk add --no-cache nginx

# Create nginx config directory
RUN mkdir -p /etc/nginx/conf.d

# Copy docker configs
COPY var/docker/nginx.conf /etc/nginx/nginx.conf
COPY var/docker/default.conf /etc/nginx/conf.d/default.conf
COPY var/docker/entrypoint.sh /app/entrypoint.sh

WORKDIR /app

# Copy the package files
COPY --from=base /app/package.json ./package.json
COPY --from=base /app/pnpm-lock.yaml ./pnpm-lock.yaml

# Copy the node_modules
COPY --from=base /app/node_modules ./node_modules

# Copy the dist
COPY --from=base /app/dist/apps/drivebase ./dist
COPY --from=base /app/web/dist ./web

# Copy tsconfig
COPY tsconfig.json ./
COPY typeorm.config.ts ./

RUN chmod +x /app/entrypoint.sh

ENV NODE_ENV=production

ENTRYPOINT ["/app/entrypoint.sh"]

