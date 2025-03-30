FROM node:22-alpine AS base

# Install build dependencies
RUN apk add --no-cache python3 make g++

# Set working directory
WORKDIR /app

# Copy package files
COPY package.json pnpm-lock.yaml ./

# Install dependencies
RUN npm i -g pnpm@9 && \
  pnpm install --frozen-lockfile

# Copy the rest of the application
COPY apps ./apps
COPY libs ./libs
COPY web ./web
COPY tsconfig.json tsconfig.build.json ./
COPY nest-cli.json webpack.config.js ./

ENV NODE_ENV=production

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

RUN chmod +x /app/entrypoint.sh

ENTRYPOINT ["/app/entrypoint.sh"]

