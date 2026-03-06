export function sanitizeProviderSegment(value: string): string {
	return value
		.trim()
		.replace(/[\\/]+/g, "-")
		.replace(/\s+/g, " ")
		.trim();
}

export function buildProviderSegments(
	providers: Array<{ id: string; name: string }>,
): Map<string, string> {
	const nameCounts = new Map<string, number>();
	for (const provider of providers) {
		const base = sanitizeProviderSegment(provider.name) || provider.id;
		nameCounts.set(base, (nameCounts.get(base) ?? 0) + 1);
	}

	const segments = new Map<string, string>();
	for (const provider of providers) {
		const base = sanitizeProviderSegment(provider.name) || provider.id;
		const segment =
			(nameCounts.get(base) ?? 0) > 1
				? `${base} (${provider.id.slice(-6)})`
				: base;
		segments.set(provider.id, segment);
	}

	return segments;
}
