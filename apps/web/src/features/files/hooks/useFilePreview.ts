import { useEffect, useRef, useState } from "react";
import { useAuthStore } from "@/features/auth/store/authStore";
import { getFileKind } from "@/features/files/utils";
import { ACTIVE_WORKSPACE_STORAGE_KEY } from "@/features/workspaces/api/workspace";

const API_BASE =
	import.meta.env.VITE_PUBLIC_API_URL?.replace("/graphql", "") || "";

/** Max text bytes rendered inline (100 KB) */
const TEXT_PREVIEW_LIMIT = 100 * 1024;

export type PreviewResult =
	| { type: "image"; url: string }
	| { type: "text"; content: string; truncated: boolean };

export function useFilePreview(
	fileId: string,
	mimeType: string | null | undefined,
) {
	const [result, setResult] = useState<PreviewResult | null>(null);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const token = useAuthStore((state) => state.token);
	const blobUrlRef = useRef<string | null>(null);

	useEffect(() => {
		const kind = getFileKind(mimeType);
		if (kind !== "image" && kind !== "text") return;

		const controller = new AbortController();
		const workspaceId =
			localStorage.getItem(ACTIVE_WORKSPACE_STORAGE_KEY) ?? undefined;

		setLoading(true);
		setError(null);
		setResult(null);

		fetch(`${API_BASE}/api/preview?fileId=${encodeURIComponent(fileId)}`, {
			signal: controller.signal,
			headers: {
				Authorization: `Bearer ${token}`,
				...(workspaceId ? { "x-workspace-id": workspaceId } : {}),
			},
		})
			.then(async (res) => {
				if (controller.signal.aborted) return;
				if (!res.ok) {
					const msg = await res.text().catch(() => `HTTP ${res.status}`);
					throw new Error(msg);
				}

				if (kind === "image") {
					const blob = await res.blob();
					if (controller.signal.aborted) return;
					// Revoke previous object URL before creating a new one
					if (blobUrlRef.current) URL.revokeObjectURL(blobUrlRef.current);
					const url = URL.createObjectURL(blob);
					blobUrlRef.current = url;
					setResult({ type: "image", url });
				} else {
					const text = await res.text();
					if (controller.signal.aborted) return;
					const truncated = text.length > TEXT_PREVIEW_LIMIT;
					setResult({
						type: "text",
						content: truncated ? text.slice(0, TEXT_PREVIEW_LIMIT) : text,
						truncated,
					});
				}
			})
			.catch((err) => {
				if (err.name === "AbortError") return;
				setError(err instanceof Error ? err.message : "Preview failed");
			})
			.finally(() => {
				if (!controller.signal.aborted) setLoading(false);
			});

		return () => {
			controller.abort();
		};
	}, [fileId, mimeType, token]);

	// Revoke blob URL on unmount
	useEffect(() => {
		return () => {
			if (blobUrlRef.current) URL.revokeObjectURL(blobUrlRef.current);
		};
	}, []);

	return { result, loading, error };
}
