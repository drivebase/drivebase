import { describe, expect, it } from "bun:test";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { DrivebaseError } from "@drivebase/core";
import { GraphQLFileLoader } from "@graphql-tools/graphql-file-loader";
import { loadSchemaSync } from "@graphql-tools/load";
import { makeExecutableSchema } from "@graphql-tools/schema";
import { GraphQLError } from "graphql";
import { createYoga } from "graphql-yoga";
import { resolvers } from "../../graphql/resolvers";

const thisDir = dirname(fileURLToPath(import.meta.url));

function createTestYoga() {
	const typeDefs = loadSchemaSync(
		join(thisDir, "../../graphql/schema/**/*.graphql"),
		{
			loaders: [new GraphQLFileLoader()],
		},
	);

	const schema = makeExecutableSchema({
		typeDefs,
		resolvers,
	});

	return createYoga({
		schema,
		context: async () =>
			({
				db: {},
				user: null,
				headers: new Headers(),
				ip: "127.0.0.1",
			}) as any,
		logging: false,
		graphiql: false,
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
	});
}

async function executeQuery(
	yoga: ReturnType<typeof createTestYoga>,
	query: string,
) {
	const request = new Request("http://localhost/graphql", {
		method: "POST",
		headers: { "content-type": "application/json" },
		body: JSON.stringify({ query }),
	});

	const response = await yoga.fetch(request);
	return response.json();
}

describe("GraphQL integration", () => {
	it("executes query resolvers through Yoga", async () => {
		const yoga = createTestYoga();
		const result = await executeQuery(yoga, "{ activities { id } }");

		expect(result.errors).toBeUndefined();
		expect(result.data.activities).toEqual([]);
	});

	it("returns auth error for protected me query without user context", async () => {
		const yoga = createTestYoga();
		const result = await executeQuery(yoga, "{ me { id } }");

		expect(result.errors).toBeDefined();
		expect(result.errors[0].message).toContain("Authentication required");
		expect(result.data.me).toBeNull();
	});
});
