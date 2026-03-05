export function normalizeIds(ids: readonly string[] | null | undefined) {
	const trimmed = (ids ?? [])
		.map((id) => id.trim())
		.filter((id) => id.length > 0);

	return Array.from(new Set(trimmed));
}
