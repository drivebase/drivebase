import { ValidationError } from "@drivebase/core";

const MIN_DOWNLOADS = 0;
const MAX_DOWNLOADS = 10000;
const MAX_EXPIRY_DAYS = 30;
const MAX_EXPIRY_MS = MAX_EXPIRY_DAYS * 24 * 60 * 60 * 1000;

export function validateFileDownloadLinkMaxDownloads(
	maxDownloads: number,
): void {
	if (!Number.isInteger(maxDownloads)) {
		throw new ValidationError("Max downloads must be an integer");
	}

	if (maxDownloads < MIN_DOWNLOADS || maxDownloads > MAX_DOWNLOADS) {
		throw new ValidationError(
			`Max downloads must be between ${MIN_DOWNLOADS} and ${MAX_DOWNLOADS} (0 means unlimited)`,
		);
	}
}

export function validateFileDownloadLinkExpiry(expiresAt: Date): void {
	if (Number.isNaN(expiresAt.getTime())) {
		throw new ValidationError("Invalid download link expiration");
	}

	const now = Date.now();
	const expiryMs = expiresAt.getTime();
	if (expiryMs <= now) {
		throw new ValidationError("Download link expiration must be in the future");
	}

	if (expiryMs - now > MAX_EXPIRY_MS) {
		throw new ValidationError(
			`Download link expiration must be within ${MAX_EXPIRY_DAYS} days`,
		);
	}
}
