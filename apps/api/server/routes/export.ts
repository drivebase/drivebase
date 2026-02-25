import { getDb } from "@drivebase/db";
import type { Context } from "hono";
import { buildExportPayload } from "../../service/export/export";
import { getAccessibleWorkspaceId } from "../../service/workspace";
import { encryptWithPassword } from "../../utils/export-crypto";
import type { AppEnv } from "../app";

export async function handleExport(c: Context<AppEnv>): Promise<Response> {
	const user = c.get("user");
	const preferredWorkspaceId = c.req.header("x-workspace-id") ?? undefined;

	const includeProviders = c.req.query("includeProviders") === "true";
	const includeSecrets = c.req.query("includeSecrets") === "true";
	const password = c.req.query("password") ?? undefined;

	const db = getDb();

	const workspaceId = await getAccessibleWorkspaceId(
		db,
		user.userId,
		preferredWorkspaceId,
	);

	const payload = await buildExportPayload(db, workspaceId, {
		includeProviders,
		// Secrets require both the flag and a password
		includeSecrets: includeSecrets && !!password,
	});

	const jsonString = JSON.stringify(payload, null, 2);
	const filename = "export.dbase";

	if (password) {
		const encrypted = encryptWithPassword(jsonString, password);
		return new Response(new Uint8Array(encrypted), {
			status: 200,
			headers: {
				"Content-Type": "application/octet-stream",
				"Content-Disposition": `attachment; filename="${filename}"`,
			},
		});
	}

	return new Response(jsonString, {
		status: 200,
		headers: {
			"Content-Type": "application/json",
			"Content-Disposition": `attachment; filename="${filename}"`,
		},
	});
}
