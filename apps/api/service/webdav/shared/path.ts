import { joinPath } from "@drivebase/core";

export function normalizeWebDavRequestPath(rawPath: string): string {
	if (!rawPath || rawPath === "/") return "/";

	const decoded = rawPath
		.split("/")
		.map((segment) => decodeURIComponent(segment))
		.join("/");

	const segments = decoded.split("/").filter(Boolean);
	if (segments.some((segment) => segment === "." || segment === "..")) {
		throw new Error("Invalid path");
	}

	return segments.reduce((path, segment) => joinPath(path, segment), "/");
}

export function splitWebDavPath(path: string): string[] {
	return path === "/" ? [] : path.split("/").filter(Boolean);
}

export function ensureTrailingSlash(path: string): string {
	if (path === "/") return path;
	return path.endsWith("/") ? path : `${path}/`;
}

export function toFolderVirtualPath(path: string): string {
	return path === "/" ? "/" : ensureTrailingSlash(path);
}

export function getParentVirtualPath(path: string): string {
	if (path === "/") return "/";
	const segments = splitWebDavPath(path);
	if (segments.length <= 1) return "/";
	return ensureTrailingSlash(`/${segments.slice(0, -1).join("/")}`);
}
