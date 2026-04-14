import type { CombinedError } from "urql";

export interface AppError {
	message: string;
	code?: string;
}

export function parseError(error: CombinedError | Error | unknown): AppError {
	if (!error) return { message: "Something went wrong" };

	// urql CombinedError
	const combined = error as CombinedError;
	if (combined.graphQLErrors?.length) {
		const gqlError = combined.graphQLErrors[0];
		return {
			message: gqlError.message,
			code: (gqlError.extensions?.code as string) ?? undefined,
		};
	}

	if (combined.networkError) {
		return { message: "Network error. Please check your connection." };
	}

	// Plain Error
	if (error instanceof Error) {
		return { message: error.message };
	}

	return { message: "Something went wrong" };
}
