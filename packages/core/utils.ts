/**
 * Utility types and helper functions
 */
import {
	formatBytes as sharedFormatBytes,
	parseBytes as sharedParseBytes,
} from "@drivebase/utils";

/**
 * Make specified properties optional
 */
export type PartialBy<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;

/**
 * Make specified properties required
 */
export type RequiredBy<T, K extends keyof T> = Omit<T, K> &
	Required<Pick<T, K>>;

/**
 * Exclude null and undefined from type
 */
export type NonNullish<T> = T extends null | undefined ? never : T;

/**
 * Make all properties nullable
 */
export type Nullable<T> = {
	[P in keyof T]: T[P] | null;
};

/**
 * Pagination parameters
 */
export interface PaginationParams {
	/** Number of items per page */
	limit?: number;
	/** Offset or page token */
	offset?: number;
	/** Cursor-based pagination token */
	cursor?: string;
}

/**
 * Paginated response
 */
export interface PaginatedResponse<T> {
	/** Items in this page */
	items: T[];
	/** Total number of items (if available) */
	total?: number;
	/** Whether there are more pages */
	hasMore: boolean;
	/** Next page cursor/token */
	nextCursor?: string;
}

/**
 * Sort order
 */
export enum SortOrder {
	ASC = "asc",
	DESC = "desc",
}

/**
 * Sort parameters
 */
export interface SortParams {
	/** Field to sort by */
	field: string;
	/** Sort order */
	order: SortOrder;
}

/**
 * Filter operator
 */
export enum FilterOperator {
	EQUALS = "eq",
	NOT_EQUALS = "neq",
	GREATER_THAN = "gt",
	GREATER_THAN_OR_EQUAL = "gte",
	LESS_THAN = "lt",
	LESS_THAN_OR_EQUAL = "lte",
	IN = "in",
	NOT_IN = "nin",
	CONTAINS = "contains",
	STARTS_WITH = "startsWith",
	ENDS_WITH = "endsWith",
}

/**
 * Filter condition
 */
export interface FilterCondition {
	/** Field to filter */
	field: string;
	/** Filter operator */
	operator: FilterOperator;
	/** Filter value */
	value: unknown;
}

/**
 * Result type for operations that can fail
 */
export type Result<T, E = Error> =
	| { success: true; data: T }
	| { success: false; error: E };

/**
 * Create a success result
 */
export function success<T>(data: T): Result<T, never> {
	return { success: true, data };
}

/**
 * Create an error result
 */
export function failure<E = Error>(error: E): Result<never, E> {
	return { success: false, error };
}

/**
 * Async result type
 */
export type AsyncResult<T, E = Error> = Promise<Result<T, E>>;

/**
 * Format bytes to human-readable string
 */
export function formatBytes(bytes: number, decimals: number = 2): string {
	return sharedFormatBytes(bytes, decimals);
}

/**
 * Parse human-readable size to bytes
 */
export function parseBytes(str: string): number {
	return sharedParseBytes(str);
}

/**
 * Sanitize filename
 */
export function sanitizeFilename(filename: string): string {
	return filename
		.replace(/[<>:"/\\|?*\x00-\x1F]/g, "_")
		.replace(/^\.+/, "")
		.slice(0, 255);
}

/**
 * Get file extension
 */
export function getFileExtension(filename: string): string {
	const lastDot = filename.lastIndexOf(".");
	if (lastDot === -1 || lastDot === 0) return "";
	return filename.slice(lastDot + 1).toLowerCase();
}

/**
 * Check if path is valid
 */
export function isValidPath(path: string): boolean {
	return /^\/(?:[^/\x00]+\/)*[^/\x00]*$/.test(path);
}

/**
 * Normalize path (remove trailing slash, deduplicate slashes)
 */
export function normalizePath(path: string): string {
	return path.replace(/\/+/g, "/").replace(/\/$/, "").replace(/^$/, "/");
}

/**
 * Join path segments
 */
export function joinPath(...segments: string[]): string {
	return normalizePath(segments.join("/"));
}

/**
 * Get parent path
 */
export function getParentPath(path: string): string {
	const normalized = normalizePath(path);
	if (normalized === "/") return "/";
	const lastSlash = normalized.lastIndexOf("/");
	return lastSlash === 0 ? "/" : normalized.slice(0, lastSlash);
}

/**
 * Get basename from path
 */
export function getBasename(path: string): string {
	const normalized = normalizePath(path);
	if (normalized === "/") return "/";
	const lastSlash = normalized.lastIndexOf("/");
	return normalized.slice(lastSlash + 1);
}

/**
 * Sleep for specified milliseconds
 */
export function sleep(ms: number): Promise<void> {
	return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Retry function with exponential backoff
 */
export async function retry<T>(
	fn: () => Promise<T>,
	options: {
		maxRetries?: number;
		initialDelay?: number;
		maxDelay?: number;
		backoffMultiplier?: number;
	} = {},
): Promise<T> {
	const {
		maxRetries = 3,
		initialDelay = 1000,
		maxDelay = 30000,
		backoffMultiplier = 2,
	} = options;

	let lastError: Error | unknown;
	let delay = initialDelay;

	for (let attempt = 0; attempt <= maxRetries; attempt++) {
		try {
			return await fn();
		} catch (error) {
			lastError = error;

			if (attempt === maxRetries) {
				break;
			}

			await sleep(delay);
			delay = Math.min(delay * backoffMultiplier, maxDelay);
		}
	}

	throw lastError;
}

/**
 * Debounce function
 */
export function debounce<T extends (...args: unknown[]) => unknown>(
	fn: T,
	delay: number,
): (...args: Parameters<T>) => void {
	let timeoutId: Timer | undefined;

	return (...args: Parameters<T>) => {
		if (timeoutId) {
			clearTimeout(timeoutId);
		}

		timeoutId = setTimeout(() => {
			fn(...args);
		}, delay);
	};
}

/**
 * Throttle function
 */
export function throttle<T extends (...args: unknown[]) => unknown>(
	fn: T,
	delay: number,
): (...args: Parameters<T>) => void {
	let lastCall = 0;

	return (...args: Parameters<T>) => {
		const now = Date.now();

		if (now - lastCall >= delay) {
			lastCall = now;
			fn(...args);
		}
	};
}
