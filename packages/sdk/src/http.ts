import {
	ApiError,
	AuthenticationError,
	NetworkError,
	type GraphQLError,
} from "./errors.ts";

interface HttpClientConfig {
	graphqlUrl: string;
	restBaseUrl: string;
	apiKey: string;
	workspaceId: string;
	fetch: typeof globalThis.fetch;
}

interface GraphQLResponse<T> {
	data?: T;
	errors?: GraphQLError[];
}

export class HttpClient {
	private readonly graphqlUrl: string;
	private readonly restBaseUrl: string;
	private readonly apiKey: string;
	private readonly workspaceId: string;
	private readonly _fetch: typeof globalThis.fetch;

	constructor(config: HttpClientConfig) {
		this.graphqlUrl = config.graphqlUrl;
		this.restBaseUrl = config.restBaseUrl;
		this.apiKey = config.apiKey;
		this.workspaceId = config.workspaceId;
		this._fetch = config.fetch;
	}

	private get headers(): Record<string, string> {
		return {
			"Content-Type": "application/json",
			Authorization: `Bearer ${this.apiKey}`,
			"x-workspace-id": this.workspaceId,
		};
	}

	/**
	 * Execute a GraphQL query/mutation and return the data for a given key.
	 */
	async graphql<T>(
		query: string,
		variables?: Record<string, unknown>,
	): Promise<T> {
		let response: Response;

		try {
			response = await this._fetch(this.graphqlUrl, {
				method: "POST",
				headers: this.headers,
				body: JSON.stringify({ query, variables }),
			});
		} catch (error) {
			throw new NetworkError(
				"Failed to connect to Drivebase API",
				error instanceof Error ? error : undefined,
			);
		}

		if (response.status === 401) {
			throw new AuthenticationError();
		}

		const body = (await response.json()) as GraphQLResponse<T>;

		if (body.errors?.length) {
			throw new ApiError(
				body.errors[0]?.message ?? "GraphQL request failed",
				body.errors,
				response.status,
			);
		}

		if (!body.data) {
			throw new ApiError("No data returned from API", [], response.status);
		}

		return body.data;
	}

	/**
	 * Make a REST request (for upload/download proxy endpoints).
	 */
	async rest(
		method: string,
		path: string,
		options: {
			body?: BodyInit;
			headers?: Record<string, string>;
			query?: Record<string, string>;
		} = {},
	): Promise<Response> {
		const url = new URL(path, this.restBaseUrl);
		if (options.query) {
			for (const [key, value] of Object.entries(options.query)) {
				url.searchParams.set(key, value);
			}
		}

		let response: Response;

		try {
			response = await this._fetch(url.toString(), {
				method,
				headers: {
					Authorization: `Bearer ${this.apiKey}`,
					"x-workspace-id": this.workspaceId,
					...options.headers,
				},
				body: options.body,
			});
		} catch (error) {
			throw new NetworkError(
				"Failed to connect to Drivebase API",
				error instanceof Error ? error : undefined,
			);
		}

		if (response.status === 401) {
			throw new AuthenticationError();
		}

		return response;
	}
}
