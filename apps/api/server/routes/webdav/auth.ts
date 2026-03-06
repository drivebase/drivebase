import { getDb } from "@drivebase/db";
import type { Context, Next } from "hono";
import { authenticateWebDavCredential } from "@/service/webdav/auth";
import { resolveWebDavPrincipalScopes } from "@/service/webdav/query/resolve-webdav-principal-scopes";
import { logger } from "@/utils/runtime/logger";
import type { AppEnv } from "../../app";

function decodeBasicAuth(
	header: string | undefined,
): { username: string; password: string } | null {
	if (!header?.startsWith("Basic ")) return null;

	try {
		const decoded = atob(header.slice("Basic ".length));
		const separator = decoded.indexOf(":");
		if (separator === -1) return null;
		return {
			username: decoded.slice(0, separator),
			password: decoded.slice(separator + 1),
		};
	} catch {
		return null;
	}
}

export async function webDavAuthMiddleware(
	c: Context<AppEnv>,
	next: Next,
): Promise<Response | undefined> {
	logger.debug({
		msg: "Received WebDAV request",
		method: c.req.method,
		path: c.req.path,
		userAgent: c.req.header("user-agent") ?? null,
		hasAuthorization: Boolean(c.req.header("authorization")),
	});

	const auth = decodeBasicAuth(c.req.header("authorization"));
	if (!auth) {
		logger.debug({
			msg: "WebDAV request missing Basic Auth header",
			method: c.req.method,
			path: c.req.path,
		});
		return new Response("Authentication required", {
			status: 401,
			headers: {
				"WWW-Authenticate": 'Basic realm="Drivebase WebDAV"',
			},
		});
	}

	try {
		const db = getDb();
		const principal = await authenticateWebDavCredential(
			db,
			auth.username,
			auth.password,
		);
		const scopes = await resolveWebDavPrincipalScopes(db, principal);
		logger.debug({
			msg: "WebDAV authentication succeeded",
			username: principal.username,
			userId: principal.userId,
			workspaceId: principal.workspaceId,
			scopeCount: scopes?.length ?? 0,
		});
		c.set("webdavPrincipal", principal);
		c.set("webdavScopes", scopes);
		await next();
		return;
	} catch (error) {
		logger.debug({
			msg: "WebDAV authentication failed",
			method: c.req.method,
			path: c.req.path,
			username: auth.username,
			error: error instanceof Error ? error.message : String(error),
		});
		return new Response("Invalid WebDAV credentials", {
			status: 401,
			headers: {
				"WWW-Authenticate": 'Basic realm="Drivebase WebDAV"',
			},
		});
	}
}
