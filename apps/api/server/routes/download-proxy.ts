import { getDb } from "@drivebase/db";
import type { Context } from "hono";
import { ActivityService } from "../../service/activity";
import { FileService } from "../../service/file";
import { ProviderService } from "../../service/provider";
import { telemetry } from "../../telemetry";
import { logger } from "../../utils/logger";
import type { AppEnv } from "../app";

/** Maps Google Workspace MIME types to { exportMime, extension } */
const GOOGLE_APPS_EXPORT: Record<
	string,
	{ exportMime: string; extension: string }
> = {
	"application/vnd.google-apps.document": {
		exportMime:
			"application/vnd.openxmlformats-officedocument.wordprocessingml.document",
		extension: "docx",
	},
	"application/vnd.google-apps.spreadsheet": {
		exportMime:
			"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
		extension: "xlsx",
	},
	"application/vnd.google-apps.presentation": {
		exportMime:
			"application/vnd.openxmlformats-officedocument.presentationml.presentation",
		extension: "pptx",
	},
	"application/vnd.google-apps.drawing": {
		exportMime: "image/png",
		extension: "png",
	},
	"application/vnd.google-apps.script": {
		exportMime: "application/vnd.google-apps.script+json",
		extension: "json",
	},
};

/**
 * Handle GET /api/download/proxy — Proxy file download from provider
 */
export async function handleDownloadProxy(
	c: Context<AppEnv>,
): Promise<Response> {
	const fileId = c.req.query("fileId");
	const user = c.get("user");

	if (!fileId) {
		return c.text("Missing fileId", 400);
	}

	logger.debug({ msg: "Proxy download started", fileId });

	try {
		const db = getDb();
		const fileService = new FileService(db);
		const providerService = new ProviderService(db);
		const workspaceId = c.req.header("x-workspace-id") ?? undefined;
		const file = await fileService.getFileForProxy(
			fileId,
			user.userId,
			workspaceId,
		);

		logger.debug({
			msg: "Streaming download from provider",
			fileId,
			providerId: file.providerId,
		});
		const stream = await fileService.downloadFileForProxy(
			fileId,
			user.userId,
			workspaceId,
		);

		providerService
			.getProvider(file.providerId, user.userId, workspaceId)
			.then((providerRecord) => {
				telemetry.capture("file_downloaded", {
					provider_type: providerRecord.type,
				});
			})
			.catch(() => {});

		// Log the download activity now — bytes are actually about to flow.
		// Fire-and-forget so we don't delay the stream response.
		new ActivityService(db)
			.log({
				type: "download",
				userId: user.userId,
				workspaceId,
				bytes: file.size,
				fileId: file.id,
				providerId: file.providerId,
				folderId: file.folderId ?? undefined,
				metadata: { name: file.name, size: file.size },
			})
			.catch(() => {});

		// Determine the correct Content-Type and filename.
		// Google Workspace native files are exported to a binary format by the
		// provider — use the exported MIME type and append the right extension.
		const exportInfo = GOOGLE_APPS_EXPORT[file.mimeType ?? ""];
		const contentType = exportInfo
			? exportInfo.exportMime
			: file.mimeType || "application/octet-stream";

		const baseName = file.name.replace(/\.(docx|xlsx|pptx|png|json)$/i, "");
		const fileName = exportInfo
			? `${baseName}.${exportInfo.extension}`
			: file.name;

		const encodedName = encodeURIComponent(fileName);
		return new Response(stream, {
			status: 200,
			headers: {
				"Content-Type": contentType,
				"Content-Disposition": `attachment; filename*=UTF-8''${encodedName}`,
			},
		});
	} catch (error) {
		logger.error({
			msg: "Proxy download failed",
			error,
			fileId,
			userId: user.userId,
		});
		const errorMessage = error instanceof Error ? error.message : String(error);
		return c.text(`Download failed: ${errorMessage}`, 500);
	}
}
