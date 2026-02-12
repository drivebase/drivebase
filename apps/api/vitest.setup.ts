process.env.NODE_ENV = process.env.NODE_ENV ?? "test";
process.env.PORT = process.env.PORT ?? "4000";
process.env.DATABASE_URL =
  process.env.DATABASE_URL ?? "postgres://postgres:postgres@localhost:5432/drivebase_test";
process.env.REDIS_URL = process.env.REDIS_URL ?? "redis://localhost:6379";
process.env.JWT_SECRET =
  process.env.JWT_SECRET ?? "test-jwt-secret-should-be-at-least-32-characters";
process.env.ENCRYPTION_KEY =
  process.env.ENCRYPTION_KEY ?? "test-encryption-key-should-be-at-least-32-characters";
process.env.CORS_ORIGIN = process.env.CORS_ORIGIN ?? "http://localhost:3000";
