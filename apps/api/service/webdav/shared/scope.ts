import { ValidationError, joinPath } from "@drivebase/core";
import type { WebDavProviderScope, WebDavProviderScopeInput } from "./types";

function normalizeScopePath(basePath?: string | null): string {
	const raw = (basePath ?? "/").trim();
	if (!raw || raw === "/") return "/";

	const normalized = `/${raw.replace(/^\/+|\/+$/g, "")}`;
	const segments = normalized.split("/").filter(Boolean);
	if (segments.some((segment) => segment === "." || segment === "..")) {
		throw new ValidationError("Invalid base path");
	}

	return segments.reduce((path, segment) => joinPath(path, segment), "/");
}

export function normalizeWebDavProviderScopes(
	inputScopes: WebDavProviderScopeInput[],
): WebDavProviderScope[] {
	if (inputScopes.length === 0) {
		throw new ValidationError("Select at least one provider scope");
	}

	const seenProviderIds = new Set<string>();

	return inputScopes.map((scope) => {
		const providerId = scope.providerId.trim();
		if (!providerId) {
			throw new ValidationError("Provider scope providerId is required");
		}
		if (seenProviderIds.has(providerId)) {
			throw new ValidationError("Duplicate provider scope");
		}

		seenProviderIds.add(providerId);
		return {
			providerId,
			basePath: normalizeScopePath(scope.basePath),
		};
	});
}

export function normalizeWebDavUsername(username: string): string {
	const normalized = username.trim().toLowerCase();
	if (!normalized) {
		throw new ValidationError("Username is required");
	}
	if (!/^[a-z0-9._@-]+$/.test(normalized)) {
		throw new ValidationError(
			"Username may only contain letters, numbers, dot, underscore, dash, and @",
		);
	}
	return normalized;
}
