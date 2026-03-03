/** Base error class for all Drivebase SDK errors */
export class DrivebaseError extends Error {
	constructor(
		message: string,
		public readonly code: string,
		public readonly statusCode?: number,
	) {
		super(message);
		this.name = "DrivebaseError";
	}
}

/** Thrown when the API returns a GraphQL error response */
export class ApiError extends DrivebaseError {
	public readonly errors: ReadonlyArray<GraphQLError>;

	constructor(
		message: string,
		errors: ReadonlyArray<GraphQLError>,
		statusCode?: number,
	) {
		super(message, "API_ERROR", statusCode);
		this.errors = errors;
		this.name = "ApiError";
	}
}

export interface GraphQLError {
	message: string;
	locations?: ReadonlyArray<{ line: number; column: number }>;
	path?: ReadonlyArray<string | number>;
	extensions?: Record<string, unknown>;
}

/** Thrown when authentication fails (missing or invalid API key) */
export class AuthenticationError extends DrivebaseError {
	constructor(message = "Authentication failed") {
		super(message, "AUTHENTICATION_ERROR", 401);
		this.name = "AuthenticationError";
	}
}

/** Thrown when a network error occurs (timeout, DNS failure, etc.) */
export class NetworkError extends DrivebaseError {
	public override readonly cause?: Error;

	constructor(message: string, cause?: Error) {
		super(message, "NETWORK_ERROR");
		this.cause = cause;
		this.name = "NetworkError";
	}
}

/** Thrown when an upload fails */
export class UploadError extends DrivebaseError {
	constructor(
		message: string,
		public readonly sessionId?: string,
	) {
		super(message, "UPLOAD_ERROR");
		this.name = "UploadError";
	}
}
