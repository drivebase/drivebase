FROM oven/bun:1.2-alpine
WORKDIR /app
COPY package.json bun.lock* ./
RUN bun install --frozen-lockfile || bun install
COPY . .
EXPOSE 4500
CMD ["bun", "run", "index.ts"]
