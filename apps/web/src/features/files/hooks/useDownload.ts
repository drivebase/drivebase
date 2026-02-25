import { useCallback } from "react";
import { useAuthStore } from "@/features/auth/store/authStore";
import { useRequestDownload } from "@/features/files/hooks/useFiles";
import { ACTIVE_WORKSPACE_STORAGE_KEY } from "@/features/workspaces/api/workspace";
import type { FileItemFragment } from "@/gql/graphql";
import { progressPanel } from "@/shared/lib/progressPanel";

function triggerSave(blobUrl: string, fileName: string) {
	const a = document.createElement("a");
	a.href = blobUrl;
	a.download = fileName;
	document.body.appendChild(a);
	a.click();
	document.body.removeChild(a);
}

export function useDownload() {
	const [, requestDownload] = useRequestDownload();
	const token = useAuthStore((state) => state.token);

	const downloadFile = useCallback(
		async (file: FileItemFragment) => {
			const ppId = progressPanel.create({
				title: file.name,
				subtitle: formatBytes(file.size ?? 0),
				phase: "blue",
				progress: 0,
				phaseLabel: "Requesting download…",
			});

			try {
				const result = await requestDownload({ id: file.id });
				if (result.error) throw new Error(result.error.message);

				const response = result.data?.requestDownload;
				if (!response?.downloadUrl)
					throw new Error("Download URL was not returned.");

				// ── Direct download (S3 presigned URL — browser↔provider) ────────────
				if (response.useDirectDownload) {
					progressPanel.update(ppId, {
						phase: "green",
						progress: 50,
						phaseLabel: "Downloading…",
					});
					triggerSave(response.downloadUrl, file.name);
					progressPanel.done(ppId, "Downloaded");
					return;
				}

				// ── Proxy download (provider → server → browser) ─────────────────────
				if (!token)
					throw new Error("You must be logged in to download this file.");

				progressPanel.update(ppId, {
					phase: "blue",
					progress: 0,
					phaseLabel: "Fetching from provider…",
				});

				const workspaceId =
					localStorage.getItem(ACTIVE_WORKSPACE_STORAGE_KEY) ?? undefined;

				const fetchResponse = await fetch(response.downloadUrl, {
					headers: {
						Authorization: `Bearer ${token}`,
						...(workspaceId ? { "x-workspace-id": workspaceId } : {}),
					},
				});

				if (!fetchResponse.ok)
					throw new Error(`Server error: ${fetchResponse.status}`);

				// Switch to green — bytes are now flowing to the browser
				const contentLength = Number(
					fetchResponse.headers.get("content-length") ?? "0",
				);
				const total = contentLength > 0 ? contentLength : (file.size ?? 0);

				progressPanel.update(ppId, {
					phase: "green",
					progress: 0,
					phaseLabel: "Downloading… 0%",
				});

				// Stream with per-chunk progress updates
				const reader = fetchResponse.body?.getReader();
				const chunks: Uint8Array[] = [];
				let received = 0;

				if (reader) {
					while (true) {
						const { done, value } = await reader.read();
						if (done) break;
						if (!value) continue;
						chunks.push(value);
						received += value.length;
						const pct =
							total > 0
								? Math.min(99, Math.round((received / total) * 100))
								: 0;
						progressPanel.update(ppId, {
							progress: pct,
							phaseLabel: `Downloading… ${pct}%`,
						});
					}
				}

				// Assemble blob
				const totalLen = chunks.reduce((s, c) => s + c.length, 0);
				const merged = new Uint8Array(totalLen);
				let offset = 0;
				for (const chunk of chunks) {
					merged.set(chunk, offset);
					offset += chunk.length;
				}

				const contentType =
					fetchResponse.headers.get("content-type") ??
					"application/octet-stream";

				// Use Content-Disposition filename if present (handles GDrive export extensions)
				const disposition = fetchResponse.headers.get("content-disposition");
				let saveAs = file.name;
				if (disposition) {
					const utf8Match = disposition.match(/filename\*=UTF-8''([^;]+)/i);
					const plainMatch = disposition.match(/filename="([^"]+)"/i);
					if (utf8Match?.[1]) saveAs = decodeURIComponent(utf8Match[1]);
					else if (plainMatch?.[1]) saveAs = plainMatch[1];
				}

				const blob = new Blob([merged], { type: contentType });
				const blobUrl = URL.createObjectURL(blob);
				try {
					triggerSave(blobUrl, saveAs);
				} finally {
					URL.revokeObjectURL(blobUrl);
				}

				progressPanel.done(ppId, "Downloaded");
			} catch (err) {
				const message = err instanceof Error ? err.message : "Download failed";
				progressPanel.error(ppId, message);
			}
		},
		[requestDownload, token],
	);

	return { downloadFile };
}

function formatBytes(bytes: number) {
	if (!bytes) return "";
	const units = ["B", "KB", "MB", "GB", "TB"];
	const exp = Math.floor(Math.log(bytes) / Math.log(1024));
	return `${(bytes / 1024 ** exp).toFixed(exp === 0 ? 0 : 1)} ${units[exp]}`;
}
