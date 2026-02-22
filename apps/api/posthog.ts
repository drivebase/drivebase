import { randomUUID } from "node:crypto";
import { PostHog } from "posthog-node";

// In production DATA_DIR is set via env (mounted Docker volume).
// In dev fall back to the directory of this file so read/write paths are consistent.
const DATA_DIR = process.env.DATA_DIR ?? import.meta.dir;
const INSTANCE_ID_PATH = `${DATA_DIR}/.instance-id`;

const telemetryEnabled =
	process.env.NODE_ENV === "production" &&
	process.env.DRIVEBASE_TELEMETRY !== "false";

async function loadOrCreateInstanceId(): Promise<{
	id: string;
	isFirstRun: boolean;
}> {
	try {
		const file = Bun.file(INSTANCE_ID_PATH);
		if (await file.exists()) {
			const id = (await file.text()).trim();
			return { id, isFirstRun: false };
		}
	} catch {
		// fall through to create
	}

	const id = randomUUID();

	try {
		await Bun.write(INSTANCE_ID_PATH, id);
	} catch {
		// DATA_DIR may not exist in local dev — fall back to cwd
		try {
			await Bun.write("./.instance-id", id);
		} catch {
			// If we still can't write, just use the generated ID in-memory
		}
	}

	return { id, isFirstRun: true };
}

const { id: instanceId, isFirstRun } = await loadOrCreateInstanceId();

export { isFirstRun };

const client = telemetryEnabled
	? new PostHog("phc_gGuDrSZi8wRhCJUg1u4Urusu94ltxVJwZRATnFPgVRc", {
			host: "https://us.i.posthog.com",
			flushAt: 10,
			flushInterval: 5000,
		})
	: null;

type TelemetryEvent =
	| { event: "server_started"; properties: { version: string; env: string } }
	| { event: "server_shutdown"; properties?: Record<string, never> }
	| { event: "user_registered"; properties: { role: string } }
	| { event: "user_login"; properties: { success: boolean } }
	| { event: "onboarding_completed"; properties?: Record<string, never> }
	| { event: "provider_connected"; properties: { type: string } }
	| { event: "provider_disconnected"; properties: { type: string } }
	| {
			event: "provider_sync_completed";
			properties: { type: string; duration_ms: number };
	  }
	| { event: "provider_oauth_initiated"; properties: { type: string } }
	| {
			event: "file_uploaded";
			properties: {
				provider_type: string;
				size_bucket: "small" | "medium" | "large" | "chunked";
				vault: boolean;
			};
	  }
	| { event: "file_downloaded"; properties: { provider_type: string } }
	| { event: "file_deleted"; properties?: Record<string, never> }
	| {
			event: "chunked_upload_completed";
			properties: { provider_type: string; size_bucket: string };
	  }
	| {
			event: "chunked_upload_failed";
			properties: { provider_type: string; reason: string };
	  }
	| { event: "vault_setup"; properties?: Record<string, never> }
	| { event: "file_rule_created"; properties?: Record<string, never> }
	| { event: "workspace_created"; properties?: Record<string, never> }
	| { event: "workspace_invite_accepted"; properties?: Record<string, never> };

export const telemetry = {
	capture<T extends TelemetryEvent>(
		event: T["event"],
		properties?: T extends { properties: infer P } ? P : undefined,
	) {
		if (!client) return;
		client.capture({
			distinctId: instanceId,
			event,
			properties: properties ?? {},
		});
	},

	async shutdown() {
		await client?.shutdown();
	},
};

/**
 * Size bucket helper for file uploads
 */
export function fileSizeBucket(
	bytes: number,
): "small" | "medium" | "large" | "chunked" {
	if (bytes < 10 * 1024 * 1024) return "small"; // <10MB
	if (bytes < 50 * 1024 * 1024) return "medium"; // <50MB
	if (bytes < 200 * 1024 * 1024) return "large"; // <200MB
	return "chunked"; // ≥200MB
}
