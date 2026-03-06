import type { Context } from "hono";
import { logger } from "@/utils/runtime/logger";
import type { AppEnv } from "../../app";
import {
	buildDavHeaders,
	buildPropfindResponse,
	mapWebDavError,
	resolveRequestResource,
	streamWebDavFile,
} from "./helpers";

export async function handleWebDavOptions(): Promise<Response> {
	logger.debug({
		msg: "Handling WebDAV OPTIONS",
	});
	return new Response(null, {
		status: 204,
		headers: buildDavHeaders(),
	});
}

export async function handleWebDavPropfind(
	c: Context<AppEnv>,
): Promise<Response> {
	try {
		const resource = await resolveRequestResource(c);
		return buildPropfindResponse(c, resource);
	} catch (error) {
		return mapWebDavError(error);
	}
}

export async function handleWebDavGetOrHead(
	c: Context<AppEnv>,
): Promise<Response> {
	try {
		const resource = await resolveRequestResource(c);
		return streamWebDavFile(c, resource);
	} catch (error) {
		return mapWebDavError(error);
	}
}

export async function handleWebDavReadOnly(): Promise<Response> {
	logger.debug({
		msg: "Rejected WebDAV write method on read-only endpoint",
	});
	return new Response("WebDAV endpoint is read-only", {
		status: 405,
		headers: buildDavHeaders(),
	});
}
