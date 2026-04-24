import pino, { type Logger, type LoggerOptions } from "pino";

export type { Logger } from "pino";

export type CreateLoggerOptions = {
  env: "dev" | "prod";
  level?: LoggerOptions["level"];
  /** When set and env === "prod", logs are appended to this file as NDJSON. */
  file?: string;
  /** Static fields attached to every record. */
  base?: Record<string, unknown>;
};

export function createLogger(opts: CreateLoggerOptions): Logger {
  const level = opts.level ?? "info";
  const base = opts.base ?? {};

  if (opts.env === "dev") {
    return pino({
      level,
      base,
      transport: {
        target: "pino-pretty",
        options: { colorize: true, translateTime: "SYS:HH:MM:ss.l" },
      },
    });
  }

  if (opts.file) {
    // pino.destination creates the parent directory when mkdir: true.
    const dest = pino.destination({
      dest: opts.file,
      sync: false,
      mkdir: true,
    });
    return pino({ level, base }, dest);
  }

  return pino({ level, base });
}

/** Create a child logger carrying a request/correlation id. */
export function withRequestId(logger: Logger, requestId: string): Logger {
  return logger.child({ requestId });
}
