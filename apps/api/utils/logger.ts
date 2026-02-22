import pino from "pino";
import pretty from "pino-pretty";
import { env } from "../config/env";

const isDevelopment = env.NODE_ENV === "development";

export const logger = pino(
	{ level: isDevelopment ? "debug" : "info" },
	pretty({
		colorize: isDevelopment,
		ignore: "pid,hostname",
		translateTime: "HH:MM:ss",
	}),
);
