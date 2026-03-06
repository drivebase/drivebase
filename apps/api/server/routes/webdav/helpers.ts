import { ConflictError, DrivebaseError, NotFoundError } from "@drivebase/core";
import { getDb } from "@drivebase/db";
import type { Context } from "hono";
import { getProvider, getProviderInstance } from "@/service/provider/query";
import {
	listWebDavCollectionMembers,
	resolveWebDavResource,
} from "@/service/webdav/query/resolve-webdav-resource";
import type { WebDavResource } from "@/service/webdav/shared/resource-types";
import { buildPropfindXml } from "@/service/webdav/xml";
import { logger } from "@/utils/runtime/logger";
import type { AppEnv } from "../../app";

export function getWebDavRequestPath(c: Context<AppEnv>): string {
	const path = c.req.path.replace(/^\/dav/, "");
	return path || "/";
}

export function isFinderMetadataProbe(path: string): boolean {
	return path
		.split("/")
		.filter(Boolean)
		.some((segment) => segment === ".DS_Store" || segment.startsWith("._"));
}

class IgnoredWebDavProbeError extends Error {
	constructor() {
		super("Ignored WebDAV client probe");
		this.name = "IgnoredWebDavProbeError";
	}
}

export function buildDavHeaders(extra?: Record<string, string>) {
	return {
		DAV: "1",
		Allow: "OPTIONS, PROPFIND, GET, HEAD",
		"MS-Author-Via": "DAV",
		...extra,
	};
}

export async function resolveRequestResource(
	c: Context<AppEnv>,
): Promise<WebDavResource> {
	const principal = c.get("webdavPrincipal");
	const scopes = c.get("webdavScopes");
	if (!principal) {
		throw new Error("Missing WebDAV principal");
	}

	const requestPath = getWebDavRequestPath(c);
	if (isFinderMetadataProbe(requestPath)) {
		throw new IgnoredWebDavProbeError();
	}

	logger.debug({
		msg: "Resolving WebDAV resource",
		method: c.req.method,
		requestPath,
		credentialId: principal.credentialId,
		workspaceId: principal.workspaceId,
	});

	return resolveWebDavResource(getDb(), principal, scopes, requestPath);
}

export async function buildPropfindResponse(
	c: Context<AppEnv>,
	resource: WebDavResource,
) {
	const principal = c.get("webdavPrincipal");
	if (!principal) {
		throw new Error("Missing WebDAV principal");
	}

	const depth = c.req.header("Depth") ?? "1";
	const resources: WebDavResource[] = [resource];
	const db = getDb();
	if (resource.kind !== "root") {
		logger.debug({
			msg: "Handling WebDAV PROPFIND",
			requestPath: resource.requestPath,
			resourceKind: resource.kind,
			depth,
			credentialId: principal.credentialId,
			workspaceId: principal.workspaceId,
		});
	}

	if (depth !== "0" && resource.kind !== "file") {
		const children = await listWebDavCollectionMembers(
			db,
			principal,
			c.get("webdavScopes"),
			resource,
		);
		resources.push(...children);
	}

	const url = new URL(c.req.url);
	const xml = buildPropfindXml(url, resources);
	if (resource.kind !== "root") {
		logger.debug({
			msg: "Built WebDAV PROPFIND response",
			requestPath: resource.requestPath,
			resourceKind: resource.kind,
			responseCount: resources.length,
		});
	}
	return new Response(xml, {
		status: 207,
		headers: buildDavHeaders({
			"Content-Type": "application/xml; charset=utf-8",
		}),
	});
}

export async function streamWebDavFile(
	c: Context<AppEnv>,
	resource: WebDavResource,
) {
	const principal = c.get("webdavPrincipal");
	if (!principal) {
		throw new Error("Missing WebDAV principal");
	}

	if (resource.kind !== "file") {
		logger.debug({
			msg: "Handling WebDAV collection body request",
			requestPath: resource.requestPath,
			resourceKind: resource.kind,
			method: c.req.method,
			credentialId: principal.credentialId,
			workspaceId: principal.workspaceId,
		});

		const body =
			c.req.method === "HEAD"
				? null
				: resource.kind === "root"
					? "Drivebase WebDAV root"
					: `Drivebase WebDAV collection: ${resource.requestPath}`;

		return new Response(body, {
			status: 200,
			headers: buildDavHeaders({
				"Content-Type": "text/plain; charset=utf-8",
			}),
		});
	}

	const providerRecord = await getProvider(
		getDb(),
		resource.provider.id,
		principal.workspaceId,
	);
	const provider = await getProviderInstance(providerRecord);
	const stream = await provider.downloadFile(resource.node.remoteId);
	logger.debug({
		msg: "Streaming WebDAV file",
		requestPath: resource.requestPath,
		fileId: resource.node.id,
		fileName: resource.node.name,
		providerId: resource.provider.id,
		size: resource.node.size,
		method: c.req.method,
	});
	const headers = buildDavHeaders({
		"Content-Type": resource.node.mimeType || "application/octet-stream",
		"Content-Length": String(resource.node.size ?? 0),
	});

	if (c.req.method === "HEAD") {
		await provider.cleanup().catch(() => {});
		return new Response(null, { status: 200, headers });
	}

	return new Response(stream, {
		status: 200,
		headers,
	});
}

export function mapWebDavError(error: unknown): Response {
	if (error instanceof IgnoredWebDavProbeError) {
		return new Response("Not found", {
			status: 404,
			headers: buildDavHeaders(),
		});
	}

	logger.debug({
		msg: "WebDAV request failed",
		error: error instanceof Error ? error.message : String(error),
	});
	if (error instanceof NotFoundError) {
		return new Response("Not found", {
			status: 404,
			headers: buildDavHeaders(),
		});
	}
	if (error instanceof ConflictError) {
		return new Response(error.message, {
			status: 405,
			headers: buildDavHeaders(),
		});
	}
	if (error instanceof DrivebaseError) {
		return new Response(error.message, {
			status: error.statusCode,
			headers: buildDavHeaders(),
		});
	}

	return new Response("WebDAV request failed", {
		status: 500,
		headers: buildDavHeaders(),
	});
}
