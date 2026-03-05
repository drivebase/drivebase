import { ValidationError } from "@drivebase/core";

const CRON_PART_REGEX = /^[\d*/,-]+$/;

export function validateCronExpression(cron: string): string {
	const trimmed = cron.trim();
	if (!trimmed) {
		throw new ValidationError("Cron expression is required");
	}

	const parts = trimmed.split(/\s+/);
	if (parts.length !== 5) {
		throw new ValidationError("Cron expression must use 5 fields");
	}

	if (parts.some((part) => !CRON_PART_REGEX.test(part))) {
		throw new ValidationError("Cron expression contains invalid characters");
	}

	return trimmed;
}
