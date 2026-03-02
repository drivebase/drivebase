import { DrivebaseError, toJsonSafeError } from "@drivebase/core";
import pino from "pino";
import pretty from "pino-pretty";
import { env } from "../config/env";

/**
 * Custom error serializer for Pino that preserves DrivebaseError metadata.
 * Ensures providerType, code, statusCode, and details are included in logs.
 */
const errSerializer = (e: unknown) =>
	e instanceof DrivebaseError ? e.toJSON() : toJsonSafeError(e);

const isDevelopment = env.NODE_ENV === "development";

const logFilePath = env.LOG_FILE_PATH ?? `${env.DATA_DIR}/logs/api.log`;

const loggerStream = isDevelopment
	? pretty({
			colorize: true,
			ignore: "pid,hostname",
			translateTime: "HH:MM:ss",
		})
	: pino.transport({
			targets: [
				{
					target: "pino/file",
					level: "info",
					options: {
						destination: 1,
					},
				},
				{
					target: "pino/file",
					level: "debug",
					options: {
						destination: logFilePath,
						mkdir: true,
					},
				},
			],
		});

export const logger = pino(
	{
		level: "debug",
		serializers: {
			err: errSerializer,
			error: errSerializer,
		},
	},
	loggerStream,
);
