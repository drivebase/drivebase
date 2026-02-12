# @drivebase/api

GraphQL API server for Drivebase built with graphql-yoga and Bun.

## Overview

The API provides a GraphQL interface for:
- User authentication and authorization
- Storage provider management
- Virtual filesystem operations (files and folders)
- Permission management
- Activity logging

## Architecture

```
apps/api/
├── config/           # Configuration (environment, provider registry)
├── graphql/          # GraphQL schema, resolvers, context
├── redis/            # Redis utilities (session, cache, rate-limit, OTP)
├── services/         # Business logic layer
├── utils/            # Utilities (JWT, password, OTP, encryption)
├── index.ts          # Server entry point
└── .env.example      # Environment variables template
```

## Getting Started

### Prerequisites

- Bun runtime
- PostgreSQL database
- Redis server

### Installation

1. Install dependencies:

```bash
bun install
```

2. Copy environment variables:

```bash
cp .env.example .env
```

3. Update `.env` with your configuration:
   - Set `DATABASE_URL` to your PostgreSQL connection string
   - Set `REDIS_URL` to your Redis connection string
   - Generate secure values for `JWT_SECRET` and `ENCRYPTION_KEY` (minimum 32 characters)

4. Run database migrations:

```bash
bun run db:migrate
```

### Development

Start the development server with hot reload:

```bash
bun run dev
```

The API will be available at `http://localhost:4000/graphql`

### Production

Start the production server:

```bash
bun run start
```

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `PORT` | Server port | `4000` |
| `NODE_ENV` | Environment (development/production) | `development` |
| `DATABASE_URL` | PostgreSQL connection string | Required |
| `REDIS_URL` | Redis connection string | `redis://localhost:6379` |
| `JWT_SECRET` | Secret for JWT signing (min 32 chars) | Required |
| `ENCRYPTION_KEY` | Key for provider credentials encryption (min 32 chars) | Required |
| `CORS_ORIGIN` | Allowed CORS origin | `http://localhost:3000` |

## GraphQL API

### Introspection

Visit `http://localhost:4000/graphql` in development to use GraphiQL playground.

### Authentication

The API uses JWT tokens stored in HTTP-only cookies. After login, the token is automatically included in subsequent requests.

**Login**:
```graphql
mutation {
  login(email: "user@example.com", password: "password123") {
    user {
      id
      email
      role
    }
    token
  }
}
```

**Query authenticated user**:
```graphql
query {
  me {
    id
    email
    role
  }
}
```

### Key Mutations

- `login` - Authenticate user
- `logout` - End session
- `changePassword` - Change password
- `requestPasswordReset` - Request password reset OTP
- `resetPassword` - Reset password with OTP
- `createUser` - Create new user (admin only)
- `connectStorage` - Connect storage provider
- `createFolder` - Create folder
- `grantFolderAccess` - Grant folder permissions

### Key Queries

- `me` - Get current user
- `users` - List all users (admin only)
- `storageProviders` - List connected providers
- `folders` - List folders
- `files` - List files in folder
- `activities` - View activity logs (admin only)

## Security

### Password Requirements

- Minimum 8 characters
- At least one letter
- At least one number

### Rate Limiting

Rate limits are applied to sensitive endpoints:

- **Auth endpoints**: 5 requests per 15 minutes
- **API calls**: 100 requests per minute
- **File uploads**: 10 requests per hour

### Encryption

All storage provider credentials are encrypted at rest using AES-256-GCM before being stored in the database.

## Services Layer

The services layer implements business logic:

- **AuthService**: Authentication, login, password management
- **UserService**: User CRUD operations
- **ProviderService**: Storage provider management (TODO)
- **FileService**: File operations (TODO)
- **FolderService**: Folder operations (TODO)
- **PermissionService**: Access control (TODO)

## Redis Usage

Redis is used for:

- **Sessions**: JWT session tracking
- **Cache**: Query result caching
- **Rate Limiting**: Request rate limiting
- **OTP**: Password reset OTPs (10 minute TTL)

## Database

See `@drivebase/db` package for schema and migrations.

## Schema-First Development

This API uses **schema-first development** with GraphQL Code Generator:

1. **Define schema** in `.graphql` files under `graphql/schema/`
2. **Generate TypeScript types** with `bun run codegen`
3. **Implement typed resolvers** in `graphql/resolvers/`

### Workflow

```bash
# 1. Edit/add schema files
vim graphql/schema/user.graphql

# 2. Generate TypeScript types
bun run codegen

# 3. Implement resolvers with full type safety
vim graphql/resolvers/user.ts
```

The code generator creates TypeScript types from your GraphQL schema, ensuring type safety between schema and implementation.

## Development Scripts

- `bun run dev` - Start development server with hot reload
- `bun run start` - Start production server
- `bun run codegen` - Generate TypeScript types from GraphQL schema
- `bun run codegen:watch` - Watch schema files and auto-generate types
- `bun run db:generate` - Generate database migrations
- `bun run db:migrate` - Run database migrations
- `bun run db:studio` - Open Drizzle Studio

## License

MIT
