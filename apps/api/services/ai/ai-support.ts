const SUPPORTED_TEXT_MIME_PREFIXES = ["text/"];
const SUPPORTED_TEXT_MIME_EXACT = new Set([
	"application/json",
	"application/csv",
]);

const SUPPORTED_IMAGE_MIME_PREFIXES = ["image/"];

const SUPPORTED_PDF_MIME_EXACT = new Set(["application/pdf"]);

export function isEligibleForAiAnalysis(mimeType: string): boolean {
	const normalized = mimeType.trim().toLowerCase();
	if (!normalized) return false;

	if (SUPPORTED_PDF_MIME_EXACT.has(normalized)) return true;
	if (SUPPORTED_TEXT_MIME_EXACT.has(normalized)) return true;

	if (
		SUPPORTED_TEXT_MIME_PREFIXES.some((prefix) => normalized.startsWith(prefix))
	) {
		return true;
	}

	if (
		SUPPORTED_IMAGE_MIME_PREFIXES.some((prefix) =>
			normalized.startsWith(prefix),
		)
	) {
		return true;
	}

	return false;
}

export function resolveMaxFileSizeMb(
	config: Record<string, unknown> | null | undefined,
	fallbackMb: number,
): number {
	const fromConfig =
		typeof config?.maxFileSizeMb === "number"
			? config.maxFileSizeMb
			: typeof config?.maxFileSizeMb === "string"
				? Number.parseFloat(config.maxFileSizeMb)
				: Number.NaN;
	if (!Number.isNaN(fromConfig) && fromConfig > 0) return fromConfig;
	return fallbackMb;
}
