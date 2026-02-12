/**
 * Base error class for Drivebase errors
 */
export class DrivebaseError extends Error {
	constructor(
		message: string,
		public readonly code: string,
		public readonly statusCode: number = 500,
		public readonly details?: Record<string, unknown>,
	) {
		super(message);
		this.name = this.constructor.name;
		Error.captureStackTrace(this, this.constructor);
	}
}

/**
 * Authentication errors
 */
export class AuthenticationError extends DrivebaseError {
	constructor(
		message: string = "Authentication failed",
		details?: Record<string, unknown>,
	) {
		super(message, "AUTHENTICATION_ERROR", 401, details);
	}
}

/**
 * Authorization errors
 */
export class AuthorizationError extends DrivebaseError {
	constructor(
		message: string = "Insufficient permissions",
		details?: Record<string, unknown>,
	) {
		super(message, "AUTHORIZATION_ERROR", 403, details);
	}
}

/**
 * Validation errors
 */
export class ValidationError extends DrivebaseError {
	constructor(message: string, details?: Record<string, unknown>) {
		super(message, "VALIDATION_ERROR", 400, details);
	}
}

/**
 * Not found errors
 */
export class NotFoundError extends DrivebaseError {
	constructor(resource: string, details?: Record<string, unknown>) {
		super(`${resource} not found`, "NOT_FOUND", 404, details);
	}
}

/**
 * Conflict errors (e.g., duplicate resource)
 */
export class ConflictError extends DrivebaseError {
	constructor(message: string, details?: Record<string, unknown>) {
		super(message, "CONFLICT", 409, details);
	}
}

/**
 * Rate limit errors
 */
export class RateLimitError extends DrivebaseError {
	constructor(
		message: string = "Rate limit exceeded",
		details?: Record<string, unknown>,
	) {
		super(message, "RATE_LIMIT_EXCEEDED", 429, details);
	}
}

/**
 * Storage provider errors
 */
export class ProviderError extends DrivebaseError {
	constructor(
		public readonly providerType: string,
		message: string,
		details?: Record<string, unknown>,
	) {
		super(message, "PROVIDER_ERROR", 500, details);
	}
}

/**
 * Quota exceeded errors
 */
export class QuotaExceededError extends DrivebaseError {
	constructor(
		message: string = "Storage quota exceeded",
		details?: Record<string, unknown>,
	) {
		super(message, "QUOTA_EXCEEDED", 507, details);
	}
}

/**
 * File operation errors
 */
export class FileOperationError extends DrivebaseError {
	constructor(
		operation: string,
		message: string,
		details?: Record<string, unknown>,
	) {
		super(
			`File ${operation} failed: ${message}`,
			"FILE_OPERATION_ERROR",
			500,
			details,
		);
	}
}

/**
 * Encryption/Decryption errors
 */
export class EncryptionError extends DrivebaseError {
	constructor(
		message: string = "Encryption/Decryption failed",
		details?: Record<string, unknown>,
	) {
		super(message, "ENCRYPTION_ERROR", 500, details);
	}
}
