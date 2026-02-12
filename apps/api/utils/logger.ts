import pino from "pino";
import { env } from "../config/env";

const isDevelopment = env.NODE_ENV === "development";

export const logger = pino({
	level: isDevelopment ? "debug" : "info",
	transport: isDevelopment
		? {
				target: "pino-pretty",
				options: {
					colorize: true,
					ignore: "pid,hostname", // Cleaner output for dev
					translateTime: "HH:MM:ss", // Simple time format
				},
			}
		: undefined,
	base: isDevelopment
		? undefined
		: { pid: process.pid, hostname: "drivebase-api" }, // More context in prod
	formatters: {
		level: (label) => {
			return { level: label };
		},
	},
});
