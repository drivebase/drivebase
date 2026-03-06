import type { WebDavResource } from "./shared/resource-types";

function escapeXml(value: string): string {
	return value
		.replaceAll("&", "&amp;")
		.replaceAll("<", "&lt;")
		.replaceAll(">", "&gt;")
		.replaceAll('"', "&quot;")
		.replaceAll("'", "&apos;");
}

function resourceDisplayName(resource: WebDavResource): string {
	switch (resource.kind) {
		case "root":
			return "Drivebase";
		case "providerRoot":
			return resource.scope.providerSegment;
		case "directory":
		case "file":
			return resource.node.name;
	}
}

function resourceContentLength(resource: WebDavResource): string {
	if (resource.kind !== "file") return "0";
	return String(resource.node.size ?? 0);
}

function resourceLastModified(resource: WebDavResource): string | null {
	switch (resource.kind) {
		case "directory":
		case "file":
			return resource.node.updatedAt?.toUTCString() ?? null;
		default:
			return null;
	}
}

function encodeHref(mountPath: string, resource: WebDavResource): string {
	const pathname =
		resource.kind === "root"
			? `${mountPath}/`
			: `${mountPath}${resource.hrefPath}`;

	return escapeXml(
		pathname
			.split("/")
			.map((segment, index) =>
				index === 0 ? segment : encodeURIComponent(segment),
			)
			.join("/"),
	);
}

function renderResponse(baseUrl: URL, resource: WebDavResource): string {
	const href = encodeHref(
		baseUrl.pathname.startsWith("/dav") ? "/dav" : "",
		resource,
	);
	const resourcetype =
		resource.kind === "file"
			? "<d:resourcetype/>"
			: "<d:resourcetype><d:collection/></d:resourcetype>";
	const contentType =
		resource.kind === "file"
			? `<d:getcontenttype>${escapeXml(resource.node.mimeType || "application/octet-stream")}</d:getcontenttype>`
			: "";
	const modified = resourceLastModified(resource);

	return `<d:response>
<d:href>${href}</d:href>
<d:propstat>
<d:prop>
<d:displayname>${escapeXml(resourceDisplayName(resource))}</d:displayname>
${resourcetype}
<d:getcontentlength>${resourceContentLength(resource)}</d:getcontentlength>
${contentType}
${modified ? `<d:getlastmodified>${escapeXml(modified)}</d:getlastmodified>` : ""}
</d:prop>
<d:status>HTTP/1.1 200 OK</d:status>
</d:propstat>
</d:response>`;
}

export function buildPropfindXml(
	baseUrl: URL,
	resources: WebDavResource[],
): string {
	const body = resources
		.map((resource) => renderResponse(baseUrl, resource))
		.join("");
	return `<?xml version="1.0" encoding="utf-8"?>
<d:multistatus xmlns:d="DAV:">
${body}
</d:multistatus>`;
}
