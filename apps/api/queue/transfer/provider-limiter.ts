import { Semaphore } from "./semaphore";

const PROVIDER_CONCURRENCY = 4;
const limiters = new Map<string, Semaphore>();

/**
 * Returns a shared semaphore for the given provider ID,
 * limiting concurrent API calls to that provider.
 */
export function getProviderLimiter(providerId: string): Semaphore {
	let limiter = limiters.get(providerId);
	if (!limiter) {
		limiter = new Semaphore(PROVIDER_CONCURRENCY);
		limiters.set(providerId, limiter);
	}
	return limiter;
}
