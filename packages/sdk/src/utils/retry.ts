const DEFAULT_MAX_RETRIES = 3;
const DEFAULT_BASE_DELAY_MS = 1000;

interface RetryOptions {
	maxRetries?: number;
	baseDelayMs?: number;
	shouldRetry?: (error: unknown, attempt: number) => boolean;
}

/**
 * Retry a function with exponential backoff.
 */
export async function withRetry<T>(
	fn: () => Promise<T>,
	options: RetryOptions = {},
): Promise<T> {
	const {
		maxRetries = DEFAULT_MAX_RETRIES,
		baseDelayMs = DEFAULT_BASE_DELAY_MS,
		shouldRetry = () => true,
	} = options;

	let lastError: unknown;

	for (let attempt = 0; attempt <= maxRetries; attempt++) {
		try {
			return await fn();
		} catch (error) {
			lastError = error;

			if (attempt === maxRetries || !shouldRetry(error, attempt)) {
				throw error;
			}

			const delay = baseDelayMs * 2 ** attempt;
			await new Promise((resolve) => setTimeout(resolve, delay));
		}
	}

	throw lastError;
}
