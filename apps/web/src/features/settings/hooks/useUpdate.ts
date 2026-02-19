import { useCallback, useEffect, useRef, useState } from "react";
import { useMutation, useQuery } from "urql";
import { useAppUpdate } from "@/shared/hooks/useAppUpdate";
import {
	TRIGGER_APP_UPDATE_MUTATION,
	UPDATE_STATUS_QUERY,
} from "@/shared/api/metadata";

type UpdatePhase = "idle" | "updating" | "success" | "error";

export function useUpdate() {
	const appUpdate = useAppUpdate();
	const [phase, setPhase] = useState<UpdatePhase>("idle");
	const [errorMessage, setErrorMessage] = useState<string | null>(null);
	const pollIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

	const [{ data: statusData }, reexecuteStatus] = useQuery({
		query: UPDATE_STATUS_QUERY,
		pause: phase !== "updating",
	});

	const [, triggerMutation] = useMutation(TRIGGER_APP_UPDATE_MUTATION);

	// Poll for status updates while updating
	useEffect(() => {
		if (phase === "updating") {
			pollIntervalRef.current = setInterval(() => {
				reexecuteStatus({ requestPolicy: "network-only" });
			}, 2000);
		}

		return () => {
			if (pollIntervalRef.current) {
				clearInterval(pollIntervalRef.current);
				pollIntervalRef.current = null;
			}
		};
	}, [phase, reexecuteStatus]);

	// React to status changes
	useEffect(() => {
		if (phase !== "updating" || !statusData?.updateStatus) return;

		const { status, message } = statusData.updateStatus;

		if (status === "done") {
			setPhase("success");
			// Auto-reload after a short delay
			setTimeout(() => {
				window.location.reload();
			}, 3000);
		} else if (status === "error") {
			setPhase("error");
			setErrorMessage(message ?? "Update failed");
		}
	}, [phase, statusData]);

	const triggerUpdate = useCallback(
		async (version?: string) => {
			setPhase("updating");
			setErrorMessage(null);

			const result = await triggerMutation({
				version: version ?? null,
			});

			if (result.error) {
				setPhase("error");
				setErrorMessage(result.error.message);
				return;
			}

			const status = result.data?.triggerAppUpdate?.status;
			if (status === "error") {
				setPhase("error");
				setErrorMessage(
					result.data?.triggerAppUpdate?.message ?? "Update failed",
				);
			}
		},
		[triggerMutation],
	);

	const updaterStatus = statusData?.updateStatus?.status ?? null;

	return {
		...appUpdate,
		phase,
		errorMessage,
		updaterStatus,
		triggerUpdate,
	};
}
