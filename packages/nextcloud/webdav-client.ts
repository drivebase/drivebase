import { ProviderError } from "@drivebase/core";

/**
 * Minimal WebDAV client for Nextcloud using raw fetch.
 * Uses Nextcloud-specific endpoints and extensions.
 */

export interface NextcloudAuth {
	serverUrl: string;
	username: string;
	appPassword: string;
}

interface DavProperty {
	name: string;
	mimeType: string;
	size: number;
	lastModified: Date;
	isDirectory: boolean;
	etag: string;
	remoteId: string;
}

function authHeaders(auth: NextcloudAuth): Record<string, string> {
	const encoded = btoa(`${auth.username}:${auth.appPassword}`);
	return {
		Authorization: `Basic ${encoded}`,
	};
}

function davFilesUrl(auth: NextcloudAuth, path: string): string {
	const base = auth.serverUrl.replace(/\/+$/, "");
	const cleanPath = path.startsWith("/") ? path : `/${path}`;
	return `${base}/remote.php/dav/files/${encodeURIComponent(auth.username)}${cleanPath.split("/").map(encodeURIComponent).join("/")}`;
}

function davUploadsUrl(
	auth: NextcloudAuth,
	uploadId: string,
	extra?: string,
): string {
	const base = auth.serverUrl.replace(/\/+$/, "");
	const suffix = extra ? `/${extra}` : "";
	return `${base}/remote.php/dav/uploads/${encodeURIComponent(auth.username)}/${uploadId}${suffix}`;
}

/**
 * Parse WebDAV PROPFIND multistatus XML response.
 * Uses a simple regex-based parser to avoid XML dependencies.
 */
function parseMultistatus(xml: string, basePath: string): DavProperty[] {
	const results: DavProperty[] = [];
	const responses = xml.split(/<d:response>/i).slice(1);

	for (const resp of responses) {
		const href = extractTag(resp, "d:href");
		if (!href) continue;

		const decodedHref = decodeURIComponent(href);
		// Extract the path relative to the WebDAV files root
		const davFilesPrefix = /\/remote\.php\/dav\/files\/[^/]+/;
		const match = davFilesPrefix.exec(decodedHref);
		const remotePath = match
			? decodedHref.slice(match.index + match[0].length) || "/"
			: decodedHref;

		// Skip the folder itself (same as basePath)
		const normalizedBase = basePath.replace(/\/+$/, "") || "/";
		const normalizedRemote = remotePath.replace(/\/+$/, "") || "/";
		if (normalizedRemote === normalizedBase) continue;

		const isDirectory = resp.includes("<d:collection/>");
		const contentLength = extractTag(resp, "d:getcontentlength");
		const contentType = extractTag(resp, "d:getcontenttype");
		const lastmod = extractTag(resp, "d:getlastmodified");
		const etag = extractTag(resp, "d:getetag");
		const ocSize = extractTag(resp, "oc:size");

		// Extract name from path
		const pathParts = normalizedRemote.split("/").filter(Boolean);
		const name = pathParts[pathParts.length - 1] ?? "";

		results.push({
			name,
			mimeType: contentType ?? "application/octet-stream",
			size: ocSize
				? parseInt(ocSize, 10)
				: contentLength
					? parseInt(contentLength, 10)
					: 0,
			lastModified: lastmod ? new Date(lastmod) : new Date(),
			isDirectory,
			etag: etag?.replace(/"/g, "") ?? "",
			remoteId: normalizedRemote,
		});
	}

	return results;
}

function extractTag(xml: string, tagName: string): string | undefined {
	// Handle both <d:tag>value</d:tag> and <tag>value</tag>
	const pattern = new RegExp(`<${tagName}[^>]*>([^<]*)</${tagName}>`, "i");
	const match = pattern.exec(xml);
	return match?.[1]?.trim() || undefined;
}

const PROPFIND_BODY = `<?xml version="1.0" encoding="UTF-8"?>
<d:propfind xmlns:d="DAV:" xmlns:oc="http://owncloud.org/ns" xmlns:nc="http://nextcloud.org/ns">
  <d:prop>
    <d:getlastmodified/>
    <d:getetag/>
    <d:getcontenttype/>
    <d:getcontentlength/>
    <d:resourcetype/>
    <oc:fileid/>
    <oc:permissions/>
    <oc:size/>
  </d:prop>
</d:propfind>`;

const QUOTA_PROPFIND_BODY = `<?xml version="1.0" encoding="UTF-8"?>
<d:propfind xmlns:d="DAV:">
  <d:prop>
    <d:quota-available-bytes/>
    <d:quota-used-bytes/>
  </d:prop>
</d:propfind>`;

/**
 * List contents of a directory via PROPFIND
 */
export async function propfind(
	auth: NextcloudAuth,
	path: string,
	depth: "0" | "1" = "1",
): Promise<DavProperty[]> {
	const url = davFilesUrl(auth, path);
	const response = await fetch(url, {
		method: "PROPFIND",
		headers: {
			...authHeaders(auth),
			"Content-Type": "application/xml",
			Depth: depth,
		},
		body: PROPFIND_BODY,
	});

	if (!response.ok && response.status !== 207) {
		throw new ProviderError(
			"nextcloud",
			`PROPFIND failed: ${response.status} ${response.statusText}`,
			{
				op: "propfind",
				method: "PROPFIND",
				path,
				status: response.status,
				statusText: response.statusText,
			},
		);
	}

	const xml = await response.text();
	return parseMultistatus(xml, path);
}

/**
 * Get metadata for a single file/folder via PROPFIND Depth: 0
 */
export async function propfindSingle(
	auth: NextcloudAuth,
	path: string,
): Promise<DavProperty> {
	const url = davFilesUrl(auth, path);
	const response = await fetch(url, {
		method: "PROPFIND",
		headers: {
			...authHeaders(auth),
			"Content-Type": "application/xml",
			Depth: "0",
		},
		body: PROPFIND_BODY,
	});

	if (!response.ok && response.status !== 207) {
		throw new ProviderError(
			"nextcloud",
			`PROPFIND failed: ${response.status} ${response.statusText}`,
			{
				op: "propfindSingle",
				method: "PROPFIND",
				path,
				status: response.status,
				statusText: response.statusText,
			},
		);
	}

	const xml = await response.text();
	// For Depth: 0, parse with a root path that won't match, so all entries are returned
	const items = parseMultistatus(xml, "/__impossible_sentinel__");

	if (items.length === 0) {
		throw new ProviderError("nextcloud", `Resource not found: ${path}`);
	}

	const item = items[0];
	if (!item) {
		throw new ProviderError("nextcloud", `Resource not found: ${path}`);
	}

	return item;
}

/**
 * Get quota via WebDAV PROPFIND on root
 */
export async function getQuotaWebdav(
	auth: NextcloudAuth,
): Promise<{ used: number; available: number | undefined }> {
	const url = davFilesUrl(auth, "/");
	const response = await fetch(url, {
		method: "PROPFIND",
		headers: {
			...authHeaders(auth),
			"Content-Type": "application/xml",
			Depth: "0",
		},
		body: QUOTA_PROPFIND_BODY,
	});

	if (!response.ok && response.status !== 207) {
		throw new ProviderError(
			"nextcloud",
			`Quota PROPFIND failed: ${response.status}`,
			{
				op: "getQuotaWebdav",
				method: "PROPFIND",
				status: response.status,
				statusText: response.statusText,
			},
		);
	}

	const xml = await response.text();
	const usedStr = extractTag(xml, "d:quota-used-bytes");
	const availStr = extractTag(xml, "d:quota-available-bytes");

	const used = usedStr ? parseInt(usedStr, 10) : 0;
	// -3 means unlimited in Nextcloud
	const available =
		availStr && parseInt(availStr, 10) >= 0
			? parseInt(availStr, 10)
			: undefined;

	return { used, available };
}

/**
 * Upload a file via PUT
 */
export async function putFile(
	auth: NextcloudAuth,
	path: string,
	data: Buffer | ReadableStream,
): Promise<void> {
	const url = davFilesUrl(auth, path);

	const body = Buffer.isBuffer(data) ? new Uint8Array(data) : data;

	const response = await fetch(url, {
		method: "PUT",
		headers: {
			...authHeaders(auth),
			"Content-Type": "application/octet-stream",
		},
		body,
	});

	if (!response.ok) {
		throw new ProviderError(
			"nextcloud",
			`PUT upload failed: ${response.status} ${response.statusText}`,
			{
				op: "putFile",
				method: "PUT",
				path,
				status: response.status,
				statusText: response.statusText,
			},
		);
	}
}

/**
 * Download a file via GET, returning a ReadableStream
 */
export async function getFile(
	auth: NextcloudAuth,
	path: string,
): Promise<ReadableStream> {
	const url = davFilesUrl(auth, path);

	const response = await fetch(url, {
		method: "GET",
		headers: authHeaders(auth),
	});

	if (!response.ok) {
		throw new ProviderError(
			"nextcloud",
			`GET download failed: ${response.status} ${response.statusText}`,
			{
				op: "getFile",
				method: "GET",
				path,
				status: response.status,
				statusText: response.statusText,
			},
		);
	}

	if (!response.body) {
		throw new ProviderError("nextcloud", "No response body for file download", {
			op: "getFile",
			path,
		});
	}

	return response.body as ReadableStream;
}

/**
 * Create a folder via MKCOL
 */
export async function mkcol(auth: NextcloudAuth, path: string): Promise<void> {
	const url = davFilesUrl(auth, path);

	const response = await fetch(url, {
		method: "MKCOL",
		headers: authHeaders(auth),
	});

	// 405 = already exists — treat as success
	if (!response.ok && response.status !== 405) {
		throw new ProviderError(
			"nextcloud",
			`MKCOL failed: ${response.status} ${response.statusText}`,
			{
				op: "mkcol",
				method: "MKCOL",
				path,
				status: response.status,
				statusText: response.statusText,
			},
		);
	}
}

/**
 * Delete a resource via DELETE
 */
export async function deleteResource(
	auth: NextcloudAuth,
	path: string,
): Promise<void> {
	const url = davFilesUrl(auth, path);

	const response = await fetch(url, {
		method: "DELETE",
		headers: authHeaders(auth),
	});

	if (!response.ok) {
		throw new ProviderError(
			"nextcloud",
			`DELETE failed: ${response.status} ${response.statusText}`,
			{
				op: "deleteResource",
				method: "DELETE",
				path,
				status: response.status,
				statusText: response.statusText,
			},
		);
	}
}

/**
 * Move a resource via MOVE
 */
export async function moveResource(
	auth: NextcloudAuth,
	sourcePath: string,
	destinationPath: string,
	overwrite = false,
): Promise<void> {
	const sourceUrl = davFilesUrl(auth, sourcePath);
	const destinationUrl = davFilesUrl(auth, destinationPath);

	const response = await fetch(sourceUrl, {
		method: "MOVE",
		headers: {
			...authHeaders(auth),
			Destination: destinationUrl,
			Overwrite: overwrite ? "T" : "F",
		},
	});

	if (!response.ok) {
		throw new ProviderError(
			"nextcloud",
			`MOVE failed: ${response.status} ${response.statusText}`,
			{
				op: "moveResource",
				method: "MOVE",
				sourcePath,
				destinationPath,
				status: response.status,
				statusText: response.statusText,
			},
		);
	}
}

/**
 * Copy a resource via COPY
 */
export async function copyResource(
	auth: NextcloudAuth,
	sourcePath: string,
	destinationPath: string,
	overwrite = false,
): Promise<void> {
	const sourceUrl = davFilesUrl(auth, sourcePath);
	const destinationUrl = davFilesUrl(auth, destinationPath);

	const response = await fetch(sourceUrl, {
		method: "COPY",
		headers: {
			...authHeaders(auth),
			Destination: destinationUrl,
			Overwrite: overwrite ? "T" : "F",
		},
	});

	if (!response.ok) {
		throw new ProviderError(
			"nextcloud",
			`COPY failed: ${response.status} ${response.statusText}`,
			{
				op: "copyResource",
				method: "COPY",
				sourcePath,
				destinationPath,
				status: response.status,
				statusText: response.statusText,
			},
		);
	}
}

/**
 * Get user info via OCS API
 */
export async function getOcsUserInfo(
	auth: NextcloudAuth,
): Promise<{ displayname?: string; email?: string }> {
	const base = auth.serverUrl.replace(/\/+$/, "");
	const url = `${base}/ocs/v2.php/cloud/user?format=json`;

	const response = await fetch(url, {
		method: "GET",
		headers: {
			...authHeaders(auth),
			"OCS-APIRequest": "true",
		},
	});

	if (!response.ok) {
		throw new ProviderError(
			"nextcloud",
			`OCS user info failed: ${response.status}`,
			{
				op: "getOcsUserInfo",
				method: "GET",
				status: response.status,
				statusText: response.statusText,
			},
		);
	}

	const body = (await response.json()) as {
		ocs?: {
			data?: {
				displayname?: string;
				email?: string;
			};
		};
	};

	return {
		displayname: body.ocs?.data?.displayname,
		email: body.ocs?.data?.email,
	};
}

// ── Chunked upload v2 ────────────────────────────────────────────────

/**
 * Initiate a chunked upload session (MKCOL on uploads endpoint)
 */
export async function chunkedUploadInit(
	auth: NextcloudAuth,
	uploadId: string,
): Promise<void> {
	const url = davUploadsUrl(auth, uploadId);

	const response = await fetch(url, {
		method: "MKCOL",
		headers: authHeaders(auth),
	});

	if (!response.ok) {
		throw new ProviderError(
			"nextcloud",
			`Chunked upload MKCOL failed: ${response.status} ${response.statusText}`,
			{
				op: "chunkedUploadInit",
				method: "MKCOL",
				uploadId,
				status: response.status,
				statusText: response.statusText,
			},
		);
	}
}

/**
 * Upload a chunk via PUT
 */
export async function chunkedUploadPart(
	auth: NextcloudAuth,
	uploadId: string,
	chunkNumber: number,
	data: Buffer,
	totalSize: number,
	destinationPath: string,
): Promise<void> {
	const url = davUploadsUrl(auth, uploadId, String(chunkNumber));
	const destUrl = davFilesUrl(auth, destinationPath);

	const response = await fetch(url, {
		method: "PUT",
		headers: {
			...authHeaders(auth),
			"Content-Type": "application/octet-stream",
			Destination: destUrl,
			"OC-Total-Length": String(totalSize),
		},
		body: new Uint8Array(data),
	});

	if (!response.ok) {
		throw new ProviderError(
			"nextcloud",
			`Chunk ${chunkNumber} upload failed: ${response.status} ${response.statusText}`,
			{
				op: "chunkedUploadPart",
				method: "PUT",
				uploadId,
				chunkNumber,
				destinationPath,
				status: response.status,
				statusText: response.statusText,
			},
		);
	}
}

/**
 * Assemble chunks into final file (MOVE .file)
 */
export async function chunkedUploadAssemble(
	auth: NextcloudAuth,
	uploadId: string,
	destinationPath: string,
	totalSize: number,
): Promise<void> {
	const sourceUrl = davUploadsUrl(auth, uploadId, ".file");
	const destUrl = davFilesUrl(auth, destinationPath);

	const response = await fetch(sourceUrl, {
		method: "MOVE",
		headers: {
			...authHeaders(auth),
			Destination: destUrl,
			"OC-Total-Length": String(totalSize),
		},
	});

	if (!response.ok) {
		throw new ProviderError(
			"nextcloud",
			`Chunk assembly failed: ${response.status} ${response.statusText}`,
			{
				op: "chunkedUploadAssemble",
				method: "MOVE",
				uploadId,
				destinationPath,
				status: response.status,
				statusText: response.statusText,
			},
		);
	}
}

/**
 * Abort a chunked upload (DELETE the upload directory)
 */
export async function chunkedUploadAbort(
	auth: NextcloudAuth,
	uploadId: string,
): Promise<void> {
	const url = davUploadsUrl(auth, uploadId);

	try {
		await fetch(url, {
			method: "DELETE",
			headers: authHeaders(auth),
		});
	} catch {
		// Best-effort abort
	}
}
