export const PAUSE_ACTION_ORDER = ["duplicate", "overwrite", "skip"] as const;

export type PauseAction = (typeof PAUSE_ACTION_ORDER)[number];

export function getPauseActions(metadata: unknown): PauseAction[] {
	if (!metadata || typeof metadata !== "object") {
		return [...PAUSE_ACTION_ORDER];
	}

	const record = metadata as Record<string, unknown>;
	const allowedResolutions = record.allowedResolutions;
	const actions = Array.isArray(allowedResolutions)
		? allowedResolutions.filter(
				(value: unknown): value is PauseAction =>
					typeof value === "string" &&
					PAUSE_ACTION_ORDER.includes(value as PauseAction),
			)
		: [];

	return actions.length > 0 ? actions : [...PAUSE_ACTION_ORDER];
}

export function canApplyToAll(metadata: unknown): boolean {
	return (
		metadata !== null &&
		typeof metadata === "object" &&
		(metadata as Record<string, unknown>).allowApplyToAll === true
	);
}
