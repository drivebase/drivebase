import type { storageProviders } from "@drivebase/db";
import { getSensitiveFields } from "@/config/providers";
import { decryptConfig } from "@/utils/encryption";

export function maskSensitiveValue(value: unknown): string {
	const raw = String(value ?? "");
	if (raw.length <= 4) return "••••";
	return `${"•".repeat(Math.min(8, raw.length - 4))}${raw.slice(-4)}`;
}

export function getProviderConfigPreview(
	providerRecord: typeof storageProviders.$inferSelect,
): Array<{ key: string; value: string; isSensitive: boolean }> {
	const sensitiveFields = getSensitiveFields(providerRecord.type);
	const decryptedConfig = decryptConfig(
		providerRecord.encryptedConfig,
		sensitiveFields,
	);

	return Object.entries(decryptedConfig).map(([key, value]) => ({
		key,
		value: sensitiveFields.includes(key)
			? maskSensitiveValue(value)
			: String(value ?? ""),
		isSensitive: sensitiveFields.includes(key),
	}));
}
