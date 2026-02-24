import { z } from "zod";

/**
 * Environment variable schema
 */
const envSchema = z.object({
	// Server
	PORT: z.string().default("4000"),
	NODE_ENV: z
		.enum(["development", "production", "test"])
		.default("development"),

	// Database
	DATABASE_URL: z.string().url(),

	// Redis
	REDIS_URL: z.string().url().default("redis://localhost:6379"),

	// Security
	JWT_SECRET: z.string().min(32),
	ENCRYPTION_KEY: z.string().min(32),

	// CORS
	CORS_ORIGIN: z.string().default("http://localhost:3000"),

	// Public base URL of this API (used to build OAuth + proxy URLs)
	// Example production value: https://app.example.com
	API_BASE_URL: z.string().url().optional(),

	// Telemetry — set to "false" to opt out of anonymous usage data
	DRIVEBASE_TELEMETRY: z.string().default("true"),

	// Path to writable data directory (used for instance ID persistence)
	DATA_DIR: z.string().default("/app/data"),

	// Optional path for provider-transfer cache/staging files
	TRANSFER_CACHE_DIR: z.string().optional(),
});

/**
 * Parse and validate environment variables
 */
function parseEnv() {
	try {
		return envSchema.parse(process.env);
	} catch (error) {
		console.error("Invalid environment variables:");
		if (error instanceof z.ZodError) {
			for (const issue of error.issues) {
				console.error(`  ${issue.path.join(".")}: ${issue.message}`);
			}
		}
		process.exit(1);
	}
}

export const env = parseEnv();

export type Env = z.infer<typeof envSchema>;
