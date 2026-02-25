import { useEffect } from "react";
import { useClient, useQuery } from "urql";
import {
	ACTIVE_UPLOAD_SESSIONS,
	UPLOAD_PROGRESS_SUBSCRIPTION,
} from "@/features/files/api/upload-session";
import { progressPanel } from "@/shared/lib/progressPanel";

/**
 * Restores visibility of active upload sessions on page reload.
 * Queries activeUploadSessions and re-creates progressPanel items
 * for any in-flight session, then subscribes for real-time updates.
 */
export function useUploadSessionRestore() {
	const client = useClient();
	const [{ data }] = useQuery({
		query: ACTIVE_UPLOAD_SESSIONS,
		requestPolicy: "network-only",
	});

	// Re-create progress panel items for sessions that were active before reload
	useEffect(() => {
		if (!data?.activeUploadSessions?.length) return;

		for (const session of data.activeUploadSessions) {
			const ppId = `session-${session.sessionId}`;
			const isTerminal =
				session.status === "completed" ||
				session.status === "failed" ||
				session.status === "cancelled";

			if (isTerminal) continue;

			const pct = calculateProgress(session);
			const isServerToProvider = session.phase === "server_to_provider";

			progressPanel.create({
				title: session.fileName,
				subtitle: formatBytes(session.totalSize),
				phase: isServerToProvider ? "blue" : "green",
				progress: pct,
				phaseLabel: isServerToProvider
					? "Uploading to provider…"
					: `Uploading… ${pct}%`,
				canCancel: true,
			});

			// Override the auto-generated id by patching — actually we need a
			// stable id to match subscription events. We'll track via a local map.
			void ppId; // the id is session-based and handled below
		}
	}, [data]);

	// Subscribe to all active sessions and update the panel in real-time
	useEffect(() => {
		const activeSessions =
			data?.activeUploadSessions?.filter(
				(s) =>
					s.status !== "completed" &&
					s.status !== "failed" &&
					s.status !== "cancelled",
			) ?? [];

		if (activeSessions.length === 0) return;

		// Map sessionId → progressPanel id (created above)
		const sessionPpIds = new Map<string, string>();
		for (const session of activeSessions) {
			const ppId = progressPanel.create({
				title: session.fileName,
				subtitle: formatBytes(session.totalSize),
				phase: session.phase === "server_to_provider" ? "blue" : "green",
				progress: calculateProgress(session),
				phaseLabel:
					session.phase === "server_to_provider"
						? "Uploading to provider…"
						: `Uploading… ${calculateProgress(session)}%`,
				canCancel: true,
			});
			sessionPpIds.set(session.sessionId, ppId);
		}

		const subscriptions = activeSessions.map((session) =>
			client
				.subscription(UPLOAD_PROGRESS_SUBSCRIPTION, {
					sessionId: session.sessionId,
				})
				.subscribe((result) => {
					const progress = result.data?.uploadProgress;
					if (!progress) return;

					const ppId = sessionPpIds.get(progress.sessionId);
					if (!ppId) return;

					const pct = calculateProgressFromEvent(progress);
					const isTerminal =
						progress.status === "completed" ||
						progress.status === "failed" ||
						progress.status === "cancelled";

					if (progress.status === "completed") {
						progressPanel.done(ppId, "Uploaded");
					} else if (progress.status === "failed") {
						progressPanel.error(ppId, progress.errorMessage ?? "Upload failed");
					} else if (progress.status === "cancelled") {
						progressPanel.error(ppId, "Cancelled");
					} else {
						const isServerToProvider = progress.phase === "server_to_provider";
						progressPanel.update(ppId, {
							phase: isServerToProvider ? "blue" : "green",
							progress: pct,
							phaseLabel: isServerToProvider
								? "Uploading to provider…"
								: `Uploading… ${pct}%`,
						});
					}

					if (isTerminal) sessionPpIds.delete(progress.sessionId);
				}),
		);

		return () => {
			for (const sub of subscriptions) sub.unsubscribe();
		};
	}, [client, data]);
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

function formatBytes(bytes: number) {
	if (!bytes) return "";
	const units = ["B", "KB", "MB", "GB", "TB"];
	const exp = Math.floor(Math.log(bytes) / Math.log(1024));
	return `${(bytes / 1024 ** exp).toFixed(exp === 0 ? 0 : 1)} ${units[exp]}`;
}
