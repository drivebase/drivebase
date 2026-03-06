import type { Hono } from "hono";
import type { AppEnv } from "../../app";
import { webDavAuthMiddleware } from "./auth";
import {
	handleWebDavGetOrHead,
	handleWebDavOptions,
	handleWebDavPropfind,
	handleWebDavReadOnly,
} from "./handlers";

export function mountWebDavRoutes(app: Hono<AppEnv>): void {
	app.use("/dav", webDavAuthMiddleware);
	app.use("/dav/*", webDavAuthMiddleware);

	app.options("/dav", handleWebDavOptions);
	app.options("/dav/*", handleWebDavOptions);
	app.on("PROPFIND", "/dav", handleWebDavPropfind);
	app.on("PROPFIND", "/dav/*", handleWebDavPropfind);
	app.on(["GET", "HEAD"], "/dav", handleWebDavGetOrHead);
	app.on(["GET", "HEAD"], "/dav/*", handleWebDavGetOrHead);

	for (const method of [
		"PUT",
		"DELETE",
		"MOVE",
		"COPY",
		"MKCOL",
		"PROPPATCH",
		"LOCK",
		"UNLOCK",
	]) {
		app.on(method, "/dav", handleWebDavReadOnly);
		app.on(method, "/dav/*", handleWebDavReadOnly);
	}
}
