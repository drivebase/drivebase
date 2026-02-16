import { join } from "node:path";
import { DrivebaseError } from "@drivebase/core";
import { GraphQLFileLoader } from "@graphql-tools/graphql-file-loader";
import { loadSchemaSync } from "@graphql-tools/load";
import { makeExecutableSchema } from "@graphql-tools/schema";
import { GraphQLError } from "graphql";
import { createYoga } from "graphql-yoga";
import { env } from "../config/env";
import { createContext } from "../graphql/context";
import { resolvers } from "../graphql/resolvers";
import { logger } from "../utils/logger";

/**
 * Load GraphQL type definitions from .graphql files
 */
const typeDefs = loadSchemaSync(
	join(import.meta.dir, "../graphql/schema/**/*.graphql"),
	{
		loaders: [new GraphQLFileLoader()],
	},
);

/**
 * Create executable schema with resolvers
 */
const schema = makeExecutableSchema({
	typeDefs,
	resolvers,
});

function isExpectedAppErrorFromGraphQLLog(payload: unknown): boolean {
	const record =
		typeof payload === "object" && payload !== null
			? (payload as Record<string, unknown>)
			: null;
	const err = (record?.err ?? record?.error ?? payload) as Record<
		string,
		unknown
	>;
	const stack = typeof err?.stack === "string" ? err.stack : "";

	return /(AuthenticationError|AuthorizationError|ValidationError|NotFoundError|ConflictError|RateLimitError|QuotaExceededError)/.test(
		stack,
	);
}

const graphQLLogger = {
	debug: () => {},
	info: (...args: unknown[]) =>
		(logger.info as (...args: unknown[]) => void).apply(logger, args),
	warn: (...args: unknown[]) =>
		(logger.warn as (...args: unknown[]) => void).apply(logger, args),
	error: (...args: unknown[]) => {
		if (isExpectedAppErrorFromGraphQLLog(args[0])) {
			(logger.warn as (...args: unknown[]) => void).apply(logger, args);
			return;
		}
		(logger.error as (...args: unknown[]) => void).apply(logger, args);
	},
};

/**
 * Create GraphQL Yoga server
 */
export const yoga = createYoga({
	schema,
	context: createContext,
	graphiql: env.NODE_ENV === "development",
	logging: graphQLLogger,
	cors: false, // CORS handled by Hono middleware
	maskedErrors: {
		maskError: (error: unknown) => {
			const original = (error as { originalError?: unknown }).originalError;

			if (original instanceof DrivebaseError) {
				return new GraphQLError(original.message, {
					extensions: {
						code: original.code,
						statusCode: original.statusCode,
						...(original.details ? { details: original.details } : {}),
					},
				});
			}

			return new GraphQLError("Unexpected error.", {
				extensions: { code: "INTERNAL_SERVER_ERROR" },
			});
		},
	},
	plugins: [],
});
