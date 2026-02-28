import { DrivebaseError, ProviderError } from "@drivebase/core";
import { logger } from "@/utils/logger";

type FileOperation = "upload" | "download" | "file_list";

interface FileErrorContext {
	userId?: string;
	workspaceId?: string;
	fileId?: string;
	providerId?: string;
	remoteId?: string;
	sessionId?: string;
	jobId?: string;
	chunkIndex?: number;
	limit?: number;
	offset?: number;
	query?: string;
	folderId?: string;
	stage?: string;
	[key: string]: unknown;
}

function getErrorMetadata(error: unknown): Record<string, unknown> {
	if (error instanceof ProviderError) {
		return {
			errorName: error.name,
			errorMessage: error.message,
			errorCode: error.code,
			statusCode: error.statusCode,
			providerType: error.providerType,
			errorDetails: error.details,
			stack: error.stack,
		};
	}

	if (error instanceof DrivebaseError) {
		return {
			errorName: error.name,
			errorMessage: error.message,
			errorCode: error.code,
			statusCode: error.statusCode,
			errorDetails: error.details,
			stack: error.stack,
		};
	}

	if (error instanceof Error) {
		return {
			errorName: error.name,
			errorMessage: error.message,
			stack: error.stack,
		};
	}

	return {
		errorName: "NonErrorThrown",
		errorMessage: String(error),
	};
}

export function logFileOperationDebugError(input: {
	operation: FileOperation;
	stage: string;
	context?: FileErrorContext;
	error: unknown;
}): void {
	logger.debug({
		msg: "File operation failed",
		operation: input.operation,
		stage: input.stage,
		...(input.context ?? {}),
		...getErrorMetadata(input.error),
	});
}
