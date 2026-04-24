import type { schema } from "@drivebase/db";

export type ProviderMapper = typeof schema.providers.$inferSelect;
export type NodeMapper = typeof schema.nodes.$inferSelect;
export type UsageMapper = typeof schema.usage.$inferSelect;
export type OAuthAppMapper = typeof schema.oauthApps.$inferSelect;
export type OperationMapper = typeof schema.operations.$inferSelect;
export type UploadSessionMapper = typeof schema.uploadSessions.$inferSelect;

export type PlanEntryMapper = {
  kind: string;
  srcPath?: string | null;
  dstPath: string;
  srcName?: string | null;
  dstName: string;
  size?: number | null;
};

export type UserMapper = {
  id: string;
  email: string;
  name: string;
};

export type ProgressEventMapper = {
  kind: "progress";
  operationId: string;
  jobId: string;
  bytes: number;
  sizeBytes?: number;
  entryKind: string;
};
export type JobStatusEventMapper = {
  kind: "status";
  operationId: string;
  jobId: string;
  status: "running" | "succeeded" | "failed" | "skipped";
  error?: string;
};
export type OperationStatusEventMapper = {
  kind: "operation";
  operationId: string;
  status: "running" | "succeeded" | "failed" | "cancelled";
};
export type ConflictDiscoveredEventMapper = {
  kind: "conflict";
  operationId: string;
  jobId: string;
  conflictId: string;
  path: string;
  existingType: string;
  incomingType: string;
};
