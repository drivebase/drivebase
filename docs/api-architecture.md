# API Architecture

## Overview

The Drivebase API is built using [Hono](https://hono.dev/), a fast, lightweight web framework with Web Standard APIs. The API serves both REST endpoints and a GraphQL API powered by GraphQL Yoga.

## Framework Stack

- **Hono**: HTTP routing and middleware
- **GraphQL Yoga**: GraphQL server (mounted at `/graphql`)
- **Bun**: Runtime and server
- **BullMQ**: Background job queue for file uploads

## Application Structure

### Entry Point (`apps/api/index.ts`)

The main entry point:
1. Initializes the application (creates default user if needed)
2. Creates the Hono app with global CORS middleware
3. Mounts core API routes
4. Mounts provider plugin routes
5. Mounts GraphQL Yoga
6. Starts the Bun server
7. Starts the BullMQ worker

### App Factory (`apps/api/server/app.ts`)

Exports `createApp()` which returns a typed Hono instance with:
- Global CORS middleware (handles dev/prod origins)
- Type-safe context with `user: JWTPayload` from auth middleware

```typescript
export type AppEnv = {
  Variables: {
    user: JWTPayload;
  };
};
```

### Authentication Middleware (`apps/api/server/middleware/auth.ts`)

Reusable middleware that:
- Extracts Bearer token from `Authorization` header
- Verifies JWT using `verifyToken()`
- Sets `c.set("user", payload)` on success
- Returns 401 JSON on failure

Applied to all protected routes.

## Route Organization

### Core Routes (`apps/api/server/routes/core.ts`)

Core API routes mounted by `mountCoreRoutes()`:

- `POST /api/upload/proxy` - Proxy file upload to provider (with auth)
- `POST /api/upload/chunk` - Chunked upload receiver (with auth)
- `GET /api/download/proxy` - Proxy file download from provider (with auth)
- `GET /webhook/callback` - OAuth provider callback (no auth)

All route handlers receive Hono `Context` instead of raw `Request`:
- `c.req.query()` for query params
- `c.req.json()` for JSON body
- `c.get("user")` for authenticated user
- `c.json()` / `c.text()` / `c.redirect()` for responses

### Provider Plugin Routes

Providers can optionally contribute REST routes via the plugin system.

#### Plugin System Design

**Provider Registration** (`packages/core/interfaces.ts`):
```typescript
export interface ProviderRegistration {
  // ... existing fields
  routes?: unknown; // Hono sub-app (typed as unknown to avoid Hono dependency in core)
  routePrefix?: string; // Mount prefix, defaults to `/api/providers/<type>`
}
```

**Mounting** (`apps/api/config/providers.ts`):
```typescript
export function mountPluginRoutes(app: Hono<AppEnv>): void {
  for (const [type, registration] of Object.entries(providerRegistry)) {
    if (registration.routes) {
      const prefix = registration.routePrefix || `/api/providers/${type}`;
      // Apply auth middleware to all plugin routes
      app.use(`${prefix}/*`, authMiddleware);
      // Mount the plugin's Hono sub-app
      app.route(prefix, registration.routes as Hono);
    }
  }
}
```

#### Example: Telegram Auth Plugin

**Routes** (`packages/telegram/routes.ts`):
```typescript
export function createTelegramRoutes(): Hono {
  const app = new Hono();
  app.post("/send-code", async (c) => { /* ... */ });
  app.post("/verify", async (c) => { /* ... */ });
  app.post("/verify-2fa", async (c) => { /* ... */ });
  return app;
}
```

**Registration** (`packages/telegram/index.ts`):
```typescript
export const telegramRegistration: ProviderRegistration = {
  // ... other fields
  routes: createTelegramRoutes(),
  routePrefix: "/api/telegram", // backwards compatible
};
```

This mounts:
- `POST /api/telegram/send-code`
- `POST /api/telegram/verify`
- `POST /api/telegram/verify-2fa`

All routes automatically have auth middleware applied.

## GraphQL Integration

GraphQL Yoga is mounted at `/graphql`:
```typescript
app.all("/graphql", (c) => yoga.fetch(c.req.raw));
```

**CORS**: Yoga's CORS is disabled (`cors: false`) because Hono's global middleware handles it.

## CORS Configuration

Global CORS middleware in `createApp()`:
- **Development**: Allows any `localhost` origin
- **Production**: Allows `env.CORS_ORIGIN`
- **Credentials**: Always `true`
- **Methods**: `POST`, `GET`, `OPTIONS`
- **Headers**: `Content-Type`, `Authorization`

## Benefits of This Architecture

1. **Separation of Concerns**: Providers own their REST routes
2. **Type Safety**: Full TypeScript support with typed context
3. **Modularity**: Easy to add new provider-specific endpoints
4. **Consistent Auth**: Auth middleware applied uniformly
5. **Clean Routes**: No more manual path matching in fetch handler
6. **Standard Patterns**: Hono follows Web Standard APIs
7. **Performance**: Hono is extremely fast and lightweight

## Migration Notes

### Before (Manual Routing)
```typescript
Bun.serve({
  async fetch(request) {
    const url = new URL(request.url);
    if (request.method === "POST" && url.pathname === "/api/upload/proxy") {
      return handleUploadProxy(request);
    }
    // ... more if/else chains
    return yoga.fetch(request);
  }
});
```

### After (Hono)
```typescript
const app = createApp();
mountCoreRoutes(app);
mountPluginRoutes(app);
app.all("/graphql", (c) => yoga.fetch(c.req.raw));
Bun.serve({ fetch: app.fetch });
```

Routes are declarative, handlers are clean, and providers can extend the API.
