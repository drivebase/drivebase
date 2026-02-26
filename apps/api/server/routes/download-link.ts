import { DrivebaseError } from "@drivebase/core";
import { getDb } from "@drivebase/db";
import type { Context } from "hono";
import { FileService } from "../../service/file";
import { getFileForProxy } from "../../service/file/query/file-read";
import { getProvider, getProviderInstance } from "../../service/provider/query";
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

function withCleanup(
	stream: ReadableStream,
	cleanup: () => Promise<void>,
): ReadableStream {
	const reader = stream.getReader();
	let cleaned = false;

	const runCleanup = async () => {
		if (cleaned) return;
		cleaned = true;
		await cleanup().catch(() => {});
	};

	return new ReadableStream({
		pull: async (controller) => {
			try {
				const { done, value } = await reader.read();
				if (done) {
					controller.close();
					await runCleanup();
					return;
				}

				if (value) {
					controller.enqueue(value);
				}
			} catch (error) {
				controller.error(error);
				await runCleanup();
			}
		},
		cancel: async () => {
			await reader.cancel();
			await runCleanup();
		},
	});
}

export async function handleDownloadLink(
	c: Context<AppEnv>,
): Promise<Response> {
	const token = c.req.query("token");
	if (!token) {
		return c.text("Missing token", 400);
	}

	logger.debug({ msg: "Download link request started" });

	try {
		const db = getDb();
		const fileService = new FileService(db);
		const downloadLink = await fileService.consumeFileDownloadLink(token);
		const file = await getFileForProxy(
			db,
			downloadLink.fileId,
			downloadLink.workspaceId,
		);
		const providerRecord = await getProvider(
			db,
			file.providerId,
			downloadLink.workspaceId,
		);
		const provider = await getProviderInstance(providerRecord);

		let sourceStream: ReadableStream;
		try {
			sourceStream = await provider.downloadFile(file.remoteId);
		} catch (error) {
			await provider.cleanup().catch(() => {});
			throw error;
		}

		const stream = withCleanup(sourceStream, () => provider.cleanup());
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
				"Cache-Control": "private, no-store",
			},
		});
	} catch (error) {
		logger.error({
			msg: "Download link request failed",
			error,
		});

		if (error instanceof DrivebaseError) {
			return new Response(`Download failed: ${error.message}`, {
				status: error.statusCode,
			});
		}

		const errorMessage = error instanceof Error ? error.message : String(error);
		return c.text(`Download failed: ${errorMessage}`, 500);
	}
}
