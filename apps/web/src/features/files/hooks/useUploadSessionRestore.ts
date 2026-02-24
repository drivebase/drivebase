import { useEffect } from "react";
import { useClient, useQuery } from "urql";
import {
	ACTIVE_UPLOAD_SESSIONS,
	UPLOAD_PROGRESS_SUBSCRIPTION,
} from "@/features/files/api/upload-session";
import type { UploadQueueItem } from "@/features/files/UploadProgressPanel";

interface UseUploadSessionRestoreOptions {
	onRestoreSessions: (items: UploadQueueItem[]) => void;
	onUpdateItem: (id: string, patch: Partial<UploadQueueItem>) => void;
}

/**
 * Restores visibility of active upload sessions on page reload.
 * Queries activeUploadSessions and subscribes to progress events
 * for each active session.
 */
export function useUploadSessionRestore({
	onRestoreSessions,
	onUpdateItem,
}: UseUploadSessionRestoreOptions) {
	const client = useClient();
	const [{ data }] = useQuery({
		query: ACTIVE_UPLOAD_SESSIONS,
		requestPolicy: "network-only",
	});

	// Restore active sessions into the upload queue on mount
	useEffect(() => {
		if (!data?.activeUploadSessions?.length) return;

		const items: UploadQueueItem[] = data.activeUploadSessions.map(
			(session) => ({
				id: `session-${session.sessionId}`,
				name: session.fileName,
				size: session.totalSize,
				progress: calculateProgress(session),
				status: mapStatus(session.status),
				sessionId: session.sessionId,
				phase: session.phase as
					| "client_to_server"
					| "server_to_provider"
					| undefined,
				canCancel:
					session.status !== "completed" &&
					session.status !== "failed" &&
					session.status !== "cancelled",
				canRetry: session.status === "failed",
				error: session.errorMessage ?? undefined,
			}),
		);

		onRestoreSessions(items);
	}, [data, onRestoreSessions]);

	// Subscribe to all active sessions and stream realtime updates per session.
	useEffect(() => {
		const activeSessions =
			data?.activeUploadSessions?.filter(
				(s) =>
					s.status !== "completed" &&
					s.status !== "failed" &&
					s.status !== "cancelled",
			) ?? [];

		if (activeSessions.length === 0) {
			return;
		}

		const subscriptions = activeSessions.map((session) =>
			client
				.subscription(UPLOAD_PROGRESS_SUBSCRIPTION, {
					sessionId: session.sessionId,
				})
				.subscribe((result) => {
					const progress = result.data?.uploadProgress;
					if (!progress) return;

					const queueId = `session-${progress.sessionId}`;
					onUpdateItem(queueId, {
						progress: calculateProgressFromEvent(progress),
						status: mapStatus(progress.status),
						phase: progress.phase as
							| "client_to_server"
							| "server_to_provider"
							| undefined,
						error: progress.errorMessage ?? undefined,
						canCancel:
							progress.status !== "completed" &&
							progress.status !== "failed" &&
							progress.status !== "cancelled",
						canRetry: progress.status === "failed",
					});
				}),
		);

		return () => {
			for (const sub of subscriptions) {
				sub.unsubscribe();
			}
		};
	}, [client, data, onUpdateItem]);
}

function calculateProgress(session: {
	receivedChunks: number;
	totalChunks: number;
	providerBytesTransferred: number;
	totalSize: number;
	phase: string;
	status: string;
}): number {
	if (session.status === "completed") return 100;
	if (session.phase === "client_to_server") {
		return Math.round(
			(session.receivedChunks / Math.max(session.totalChunks, 1)) * 50,
		);
	}
	// server_to_provider phase
	return Math.round(
		50 +
			(session.providerBytesTransferred / Math.max(session.totalSize, 1)) * 50,
	);
}

function calculateProgressFromEvent(event: {
	receivedChunks: number;
	totalChunks: number;
	providerBytesTransferred: number;
	totalSize: number;
	phase: string;
	status: string;
}): number {
	return calculateProgress(event);
}

function mapStatus(
	status: string,
): "queued" | "uploading" | "success" | "error" | "transferring" | "cancelled" {
	switch (status) {
		case "completed":
			return "success";
		case "failed":
			return "error";
		case "cancelled":
			return "cancelled";
		case "transferring":
			return "transferring";
		case "pending":
			return "queued";
		default:
			return "uploading";
	}
}
