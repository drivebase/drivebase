import { z } from "zod";

const base64Key32 = z
  .string()
  .min(44)
  .refine(
    (v) => {
      try {
        const buf = Buffer.from(v, "base64");
        return buf.byteLength === 32;
      } catch {
        return false;
      }
    },
    { message: "must be base64 of exactly 32 bytes" },
  );

export const AppConfigSchema = z.object({
  server: z.object({
    env: z.enum(["dev", "prod"]).default("dev"),
    port: z.number().int().positive().default(4000),
    host: z.string().default("0.0.0.0"),
  }),
  db: z.object({
    url: z.string().min(1),
  }),
  redis: z.object({
    url: z.string().min(1),
  }),
  crypto: z.object({
    masterKeyBase64: base64Key32,
  }),
  auth: z.object({
    betterAuthSecret: z.string().min(16),
    baseUrl: z.string().url(),
    trustedOrigins: z.array(z.string().url()).default([]),
  }),
  uploads: z
    .object({
      stagingDir: z.string().min(1).default("/tmp/drivebase-uploads"),
      defaultChunkSizeBytes: z
        .number()
        .int()
        .positive()
        .default(8 * 1024 * 1024),
      sessionTtlSeconds: z
        .number()
        .int()
        .positive()
        .default(24 * 60 * 60),
    })
    .prefault({}),
  cache: z
    .object({
      childrenTtlSeconds: z.number().int().positive().default(60),
      usageTtlSeconds: z
        .number()
        .int()
        .positive()
        .default(10 * 60),
    })
    .prefault({}),
  workers: z
    .object({
      concurrency: z
        .object({
          upload: z.number().int().positive().default(4),
          download: z.number().int().positive().default(4),
          transfer: z.number().int().positive().default(4),
          copy: z.number().int().positive().default(4),
          move: z.number().int().positive().default(4),
          delete: z.number().int().positive().default(4),
          syncReconcile: z.number().int().positive().default(1),
          usageRefresh: z.number().int().positive().default(1),
        })
        .prefault({}),
    })
    .prefault({}),
  log: z
    .object({
      level: z
        .enum(["trace", "debug", "info", "warn", "error", "fatal"])
        .default("info"),
      file: z.string().optional(),
    })
    .prefault({}),
});

export type AppConfig = z.infer<typeof AppConfigSchema>;
export type QueueName = keyof AppConfig["workers"]["concurrency"];
