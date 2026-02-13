import { join } from "node:path";
import { DrivebaseError } from "@drivebase/core";
import { files, getDb } from "@drivebase/db";
import { GraphQLFileLoader } from "@graphql-tools/graphql-file-loader";
import { loadSchemaSync } from "@graphql-tools/load";
import { makeExecutableSchema } from "@graphql-tools/schema";
import { eq } from "drizzle-orm";
import { GraphQLError } from "graphql";
import { createYoga } from "graphql-yoga";
import { env } from "./config/env";
import { createContext } from "./graphql/context";
import { resolvers } from "./graphql/resolvers";
import { FileService } from "./services/file";
import { ProviderService } from "./services/provider";
import { initializeApp } from "./utils/init";
import { verifyToken } from "./utils/jwt";
import { logger } from "./utils/logger";

/**
 * Initialize application (create default user if needed)
 */
await initializeApp();

/**
 * Load GraphQL type definitions from .graphql files
 */
const typeDefs = loadSchemaSync(
	join(import.meta.dir, "./graphql/schema/**/*.graphql"),
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

/**
 * Mask sensitive data in logs
 */
function _maskSensitive(data: unknown): unknown {
	if (!data) return data;
	if (typeof data !== "object") return data;

	const sensitiveKeys = ["password", "token", "otp", "secret", "authorization"];
	const masked = { ...(data as Record<string, unknown>) };

	for (const key in masked) {
		if (sensitiveKeys.some((k) => key.toLowerCase().includes(k))) {
			masked[key] = "***MASKED***";
		} else if (typeof masked[key] === "object" && masked[key] !== null) {
			masked[key] = _maskSensitive(masked[key]);
		}
	}

	return masked;
}

function getProxyCorsHeaders() {
	return {
		"Access-Control-Allow-Origin": env.CORS_ORIGIN,
		"Access-Control-Allow-Credentials": "true",
	};
}

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
const yoga = createYoga({
	schema,
	context: createContext,
	graphiql: env.NODE_ENV === "development",
	logging: graphQLLogger,
	cors: (request) => {
		const origin = request.headers.get("origin");

		// In development, allow all localhost origins
		if (env.NODE_ENV === "development" && origin?.includes("localhost")) {
			return {
				origin: origin,
				credentials: true,
				methods: ["POST", "GET", "OPTIONS"],
				allowedHeaders: ["Content-Type", "Authorization"],
			};
		}

		// In production, use configured origin
		return {
			origin: env.CORS_ORIGIN,
			credentials: true,
			methods: ["POST", "GET", "OPTIONS"],
			allowedHeaders: ["Content-Type", "Authorization"],
		};
	},
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

/**
 * Handle GET /webhook/callback — OAuth provider callback.
 * The provider ID is extracted from the `state` query param (set during initiateOAuth).
 * Register http://localhost:4000/webhook/callback in your provider's developer console.
 */
async function handleOAuthCallback(request: Request): Promise<Response> {
	const url = new URL(request.url);

	const code = url.searchParams.get("code");
	const state = url.searchParams.get("state");

	if (!code) {
		return new Response("Missing authorization code", { status: 400 });
	}
	if (!state) {
		return new Response("Missing state parameter", { status: 400 });
	}

	try {
		const db = getDb();
		const providerService = new ProviderService(db);
		await providerService.handleOAuthCallback(code, state);

		const frontendUrl = env.CORS_ORIGIN;
		return Response.redirect(`${frontendUrl}/providers?connected=true`, 302);
	} catch (error) {
		logger.error({ msg: "OAuth callback failed", error });
		const frontendUrl = env.CORS_ORIGIN;
		return Response.redirect(
			`${frontendUrl}/providers?error=oauth_failed`,
			302,
		);
	}
}

/**
 * Handle POST /api/upload/proxy — Proxy file upload to provider
 */
async function handleUploadProxy(request: Request): Promise<Response> {
	const url = new URL(request.url);
	const fileId = url.searchParams.get("fileId");

	const corsHeaders = getProxyCorsHeaders();

	if (!fileId) {
		return new Response("Missing fileId", {
			status: 400,
			headers: corsHeaders,
		});
	}

	logger.debug({ msg: "Proxy upload started", fileId });

	// 1. Authenticate
	const authHeader = request.headers.get("Authorization");
	if (!authHeader || !authHeader.startsWith("Bearer ")) {
		return new Response("Unauthorized", { status: 401, headers: corsHeaders });
	}
	const token = authHeader.split(" ")[1];
	if (!token) {
		return new Response("Unauthorized", { status: 401, headers: corsHeaders });
	}

	let userId: string;
	try {
		const payload = await verifyToken(token);
		userId = payload.userId;
	} catch (_error) {
		return new Response("Invalid token", { status: 401, headers: corsHeaders });
	}

	// 2. Get file record and provider
	try {
		const db = getDb();
		const fileService = new FileService(db);
		const file = await fileService.getFile(fileId, userId);

		const providerService = new ProviderService(db);
		const providerRecord = await providerService.getProvider(
			file.providerId,
			userId,
		);
		const provider = await providerService.getProviderInstance(providerRecord);

		// 3. Upload
		if (!request.body) {
			return new Response("Missing body", {
				status: 400,
				headers: corsHeaders,
			});
		}

		logger.debug({
			msg: "Streaming upload to provider",
			fileId,
			providerId: file.providerId,
		});
		await provider.uploadFile(file.remoteId, request.body);
		await provider.cleanup();

		logger.debug({ msg: "Proxy upload success", fileId });

		return new Response(JSON.stringify({ success: true }), {
			headers: { "Content-Type": "application/json", ...corsHeaders },
		});
	} catch (error) {
		logger.error({ msg: "Proxy upload failed", error, fileId, userId });

		// Cleanup: Delete file record and remote file if possible
		try {
			if (fileId) {
				const db = getDb();
				await db.delete(files).where(eq(files.id, fileId));
			}
		} catch (cleanupError) {
			logger.error({
				msg: "Failed to cleanup after upload failure",
				error: cleanupError,
				fileId,
			});
		}

		const errorMessage = error instanceof Error ? error.message : String(error);
		return new Response(`Upload failed: ${errorMessage}`, {
			status: 500,
			headers: corsHeaders,
		});
	}
}

/**
 * Handle GET /api/download/proxy — Proxy file download from provider
 */
async function handleDownloadProxy(request: Request): Promise<Response> {
	const url = new URL(request.url);
	const fileId = url.searchParams.get("fileId");
	const corsHeaders = getProxyCorsHeaders();

	if (!fileId) {
		return new Response("Missing fileId", {
			status: 400,
			headers: corsHeaders,
		});
	}

	logger.debug({ msg: "Proxy download started", fileId });

	const authHeader = request.headers.get("Authorization");
	if (!authHeader || !authHeader.startsWith("Bearer ")) {
		return new Response("Unauthorized", { status: 401, headers: corsHeaders });
	}

	const token = authHeader.split(" ")[1];
	if (!token) {
		return new Response("Unauthorized", { status: 401, headers: corsHeaders });
	}

	let userId: string;
	try {
		const payload = await verifyToken(token);
		userId = payload.userId;
	} catch (_error) {
		return new Response("Invalid token", { status: 401, headers: corsHeaders });
	}

	try {
		const db = getDb();
		const fileService = new FileService(db);
		const file = await fileService.getFile(fileId, userId);

		logger.debug({
			msg: "Streaming download from provider",
			fileId,
			providerId: file.providerId,
		});
		const stream = await fileService.downloadFile(fileId, userId);

		const encodedName = encodeURIComponent(file.name);
		return new Response(stream, {
			status: 200,
			headers: {
				...corsHeaders,
				"Content-Type": file.mimeType || "application/octet-stream",
				"Content-Disposition": `attachment; filename*=UTF-8''${encodedName}`,
			},
		});
	} catch (error) {
		logger.error({ msg: "Proxy download failed", error, fileId, userId });
		const errorMessage = error instanceof Error ? error.message : String(error);
		return new Response(`Download failed: ${errorMessage}`, {
			status: 500,
			headers: corsHeaders,
		});
	}
}

/**
 * Start Bun server
 */
const server = Bun.serve({
	port: parseInt(env.PORT, 10),
	development: env.NODE_ENV === "development",
	async fetch(request) {
		const url = new URL(request.url);

		// OAuth callback route — must be handled before Yoga
		if (request.method === "GET" && url.pathname === "/webhook/callback") {
			return handleOAuthCallback(request);
		}

		// Proxy upload route
		if (request.method === "POST" && url.pathname === "/api/upload/proxy") {
			return handleUploadProxy(request);
		}
		if (request.method === "OPTIONS" && url.pathname === "/api/upload/proxy") {
			return new Response(null, {
				headers: {
					"Access-Control-Allow-Origin": env.CORS_ORIGIN,
					"Access-Control-Allow-Methods": "POST, OPTIONS",
					"Access-Control-Allow-Headers": "Content-Type, Authorization",
					"Access-Control-Allow-Credentials": "true",
				},
			});
		}
		if (request.method === "GET" && url.pathname === "/api/download/proxy") {
			return handleDownloadProxy(request);
		}
		if (
			request.method === "OPTIONS" &&
			url.pathname === "/api/download/proxy"
		) {
			return new Response(null, {
				headers: {
					"Access-Control-Allow-Origin": env.CORS_ORIGIN,
					"Access-Control-Allow-Methods": "GET, OPTIONS",
					"Access-Control-Allow-Headers": "Authorization",
					"Access-Control-Allow-Credentials": "true",
				},
			});
		}

		return yoga.fetch(request);
	},
});

logger.info(`Drivebase API running on http://localhost:${server.port}/graphql`);

// Graceful shutdown
process.on("SIGINT", async () => {
	logger.info("Shutting down gracefully...");
	server.stop();
	process.exit(0);
});

process.on("SIGTERM", async () => {
	logger.info("Shutting down gracefully...");
	server.stop();
	process.exit(0);
});
