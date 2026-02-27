import type { ProviderFileLifecycleState } from "@drivebase/core";
import type { FileLifecycleView } from "./types";

export function toLifecycleView(input: {
	lifecycleState: string;
	storageClass: string | null;
	restoreRequestedAt: Date | null;
	restoreExpiresAt: Date | null;
	lifecycleCheckedAt: Date | null;
}): FileLifecycleView {
	return {
		state: normalizeState(input.lifecycleState),
		storageClass: input.storageClass,
		restoreRequestedAt: input.restoreRequestedAt,
		restoreExpiresAt: input.restoreExpiresAt,
		lastCheckedAt: input.lifecycleCheckedAt,
	};
}

export function mapProviderLifecycleState(state: ProviderFileLifecycleState): {
	lifecycleState: FileLifecycleView["state"];
	storageClass: string | null;
	restoreRequestedAt: Date | null;
	restoreExpiresAt: Date | null;
	lifecycleCheckedAt: Date;
} {
	return {
		lifecycleState: normalizeState(state.state),
		storageClass: state.storageClass ?? null,
		restoreRequestedAt: state.restoreRequestedAt ?? null,
		restoreExpiresAt: state.restoreExpiresAt ?? null,
		lifecycleCheckedAt: state.lastCheckedAt,
	};
}

function normalizeState(value: string): FileLifecycleView["state"] {
	if (
		value === "hot" ||
		value === "archived" ||
		value === "restore_requested" ||
		value === "restoring" ||
		value === "restored_temporary" ||
		value === "unknown"
	) {
		return value;
	}
	return "unknown";
}
