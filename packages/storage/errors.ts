/**
 * Structured error hierarchy. Providers throw these; orchestrator and
 * GraphQL resolvers discriminate on `code`.
 */
export abstract class DrivebaseError extends Error {
  abstract readonly code: string;
  constructor(message: string, readonly cause?: unknown) {
    super(message);
    this.name = this.constructor.name;
  }
}

export class ProviderError extends DrivebaseError {
  readonly code = "PROVIDER_ERROR";
  constructor(
    message: string,
    readonly provider: string,
    cause?: unknown,
  ) {
    super(message, cause);
  }
}

export class NotImplementedError extends DrivebaseError {
  readonly code = "NOT_IMPLEMENTED";
  constructor(what: string) {
    super(`${what} is not implemented`);
  }
}

export class AuthError extends DrivebaseError {
  readonly code = "AUTH_ERROR";
}

export class NotFoundError extends DrivebaseError {
  readonly code = "NOT_FOUND";
}

export class ConflictError extends DrivebaseError {
  readonly code = "CONFLICT";
  constructor(
    message: string,
    readonly path: string,
  ) {
    super(message);
  }
}

export class RateLimitError extends DrivebaseError {
  readonly code = "RATE_LIMITED";
  constructor(
    message: string,
    readonly retryAfterMs?: number,
  ) {
    super(message);
  }
}

export class CryptoError extends DrivebaseError {
  readonly code = "CRYPTO_ERROR";
}
