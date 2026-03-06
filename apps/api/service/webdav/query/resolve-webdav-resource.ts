import { NotFoundError } from "@drivebase/core";
import type {
	ContentsResult,
	FileRecord,
	FolderRecord,
} from "@/service/file/types";
import { getContents } from "@/service/file/query/contents";
import { logger } from "@/utils/runtime/logger";
import type { Database, StorageProvider } from "@drivebase/db";
import { storageProviders } from "@drivebase/db";
import { and, eq, inArray } from "drizzle-orm";
import {
	ensureTrailingSlash,
	normalizeWebDavRequestPath,
	splitWebDavPath,
} from "../shared/path";
import type { WebDavResource } from "../shared/resource-types";
import type { WebDavResolvedProviderScope } from "../shared/types";

type WebDavPrincipalRef = {
	workspaceId: string;
};

function isDirectoryResource(
	resource: WebDavResource,
): resource is Extract<WebDavResource, { kind: "directory" }> {
	return resource.kind === "directory";
}

function isFileResource(
	resource: WebDavResource,
): resource is Extract<WebDavResource, { kind: "file" }> {
	return resource.kind === "file";
}

async function getProviderMap(
	db: Database,
	workspaceId: string,
	providerIds: string[],
): Promise<Map<string, Pick<StorageProvider, "id" | "name" | "workspaceId">>> {
	if (providerIds.length === 0) return new Map();

	const providers = await db
		.select({
			id: storageProviders.id,
			name: storageProviders.name,
			workspaceId: storageProviders.workspaceId,
		})
		.from(storageProviders)
		.where(
			and(
				eq(storageProviders.workspaceId, workspaceId),
				inArray(storageProviders.id, providerIds),
				eq(storageProviders.isActive, true),
			),
		);

	return new Map(providers.map((provider) => [provider.id, provider]));
}

async function getScopedRootContents(
	db: Database,
	principal: WebDavPrincipalRef,
	scope: WebDavResolvedProviderScope,
): Promise<ContentsResult> {
	const providerIds = [scope.providerId];
	if (scope.basePath === "/") {
		return getContents(db, principal.workspaceId, null, undefined, providerIds);
	}

	const rootContents = await getContents(
		db,
		principal.workspaceId,
		null,
		undefined,
		providerIds,
	);

	const segments = splitWebDavPath(scope.basePath);
	let currentFolder: (typeof rootContents.folders)[number] | undefined =
		rootContents.folders.find((folder) => folder.name === segments[0]);

	for (let index = 1; index < segments.length && currentFolder; index += 1) {
		const nextContents = await getContents(
			db,
			principal.workspaceId,
			null,
			currentFolder.id,
			providerIds,
		);
		currentFolder = nextContents.folders.find(
			(folder) => folder.name === segments[index],
		);
	}

	if (!currentFolder) {
		logger.debug({
			msg: "Scoped WebDAV base path folder was not found",
			workspaceId: principal.workspaceId,
			providerId: scope.providerId,
			basePath: scope.basePath,
		});
		return { files: [], folders: [], folder: null };
	}

	return getContents(
		db,
		principal.workspaceId,
		null,
		currentFolder.id,
		providerIds,
	);
}

function dedupeById<T extends { id: string }>(items: T[]): T[] {
	const seen = new Set<string>();
	return items.filter((item) => {
		if (seen.has(item.id)) return false;
		seen.add(item.id);
		return true;
	});
}

async function getRootContents(
	db: Database,
	principal: WebDavPrincipalRef,
	scopes: WebDavResolvedProviderScope[] | null,
): Promise<ContentsResult> {
	if (!scopes || scopes.length === 0) {
		return getContents(db, principal.workspaceId, null);
	}

	const results = await Promise.all(
		scopes.map((scope) => getScopedRootContents(db, principal, scope)),
	);

	return {
		files: dedupeById(results.flatMap((result) => result.files)),
		folders: dedupeById(results.flatMap((result) => result.folders)),
		folder: null,
	};
}

async function getDirectoryContents(
	db: Database,
	principal: WebDavPrincipalRef,
	resource: Extract<WebDavResource, { kind: "directory" }>,
): Promise<ContentsResult> {
	return getContents(db, principal.workspaceId, null, resource.node.id, [
		resource.provider.id,
	]);
}

async function listCollectionContents(
	db: Database,
	principal: WebDavPrincipalRef,
	scopes: WebDavResolvedProviderScope[] | null,
	resource: Extract<WebDavResource, { kind: "root" | "directory" }>,
): Promise<ContentsResult> {
	if (resource.kind === "root") {
		const contents = await getRootContents(db, principal, scopes);
		return contents;
	}
	const contents = await getDirectoryContents(db, principal, resource);
	logger.debug({
		msg: "Loaded WebDAV directory contents",
		requestPath: resource.requestPath,
		directoryId: resource.node.id,
		providerId: resource.provider.id,
		folderCount: contents.folders.length,
		fileCount: contents.files.length,
		folders: contents.folders.map((folder) => ({
			id: folder.id,
			name: folder.name,
			providerId: folder.providerId,
		})),
		files: contents.files.map((file) => ({
			id: file.id,
			name: file.name,
			providerId: file.providerId,
		})),
	});
	return contents;
}

function resolveScopeForNode(
	scopes: WebDavResolvedProviderScope[] | null,
	node: FolderRecord | FileRecord,
): WebDavResolvedProviderScope | null {
	return scopes?.find((scope) => scope.providerId === node.providerId) ?? null;
}

function toChildResource(
	resource: Extract<WebDavResource, { kind: "root" | "directory" }>,
	node: FolderRecord | FileRecord,
	provider: Pick<StorageProvider, "id" | "name" | "workspaceId">,
	scopes: WebDavResolvedProviderScope[] | null,
): WebDavResource {
	const requestPath =
		resource.kind === "root"
			? `/${node.name}`
			: `${resource.requestPath}/${node.name}`.replace(/\/+/g, "/");
	const hrefPath =
		node.nodeType === "folder" ? ensureTrailingSlash(requestPath) : requestPath;

	return {
		kind: node.nodeType === "folder" ? "directory" : "file",
		requestPath,
		hrefPath,
		scope: resolveScopeForNode(scopes, node),
		provider,
		node,
	};
}

export async function listWebDavCollectionMembers(
	db: Database,
	principal: WebDavPrincipalRef,
	scopes: WebDavResolvedProviderScope[] | null,
	resource: Extract<WebDavResource, { kind: "root" | "directory" }>,
): Promise<WebDavResource[]> {
	const contents = await listCollectionContents(
		db,
		principal,
		scopes,
		resource,
	);
	const providerIds = Array.from(
		new Set(
			[...contents.folders, ...contents.files].map((entry) => entry.providerId),
		),
	);
	const providerMap = await getProviderMap(
		db,
		principal.workspaceId,
		providerIds,
	);

	return [...contents.folders, ...contents.files]
		.map((entry) => {
			const provider = providerMap.get(entry.providerId);
			if (!provider) return null;
			return toChildResource(resource, entry, provider, scopes);
		})
		.filter((entry): entry is WebDavResource => entry !== null);
}

export async function resolveWebDavResource(
	db: Database,
	principal: WebDavPrincipalRef,
	scopes: WebDavResolvedProviderScope[] | null,
	rawRequestPath: string,
): Promise<WebDavResource> {
	const requestPath = normalizeWebDavRequestPath(rawRequestPath);
	if (requestPath === "/") {
		logger.debug({
			msg: "Resolved WebDAV root resource",
			workspaceId: principal.workspaceId,
			scopedProviderCount: scopes?.length ?? 0,
		});
		return {
			kind: "root",
			requestPath,
			hrefPath: "/",
		};
	}

	const segments = splitWebDavPath(requestPath);
	let current: Extract<WebDavResource, { kind: "root" | "directory" }> = {
		kind: "root",
		requestPath: "/",
		hrefPath: "/",
	};

	for (let index = 0; index < segments.length; index += 1) {
		const segment = segments[index];
		const children = await listWebDavCollectionMembers(
			db,
			principal,
			scopes,
			current,
		);
		const folderMatch = children.find(
			(child): child is Extract<WebDavResource, { kind: "directory" }> =>
				isDirectoryResource(child) && child.node.name === segment,
		);
		if (folderMatch) {
			if (index === segments.length - 1) {
				logger.debug({
					msg: "Resolved WebDAV directory resource",
					requestPath: folderMatch.requestPath,
					providerId: folderMatch.provider.id,
					nodeId: folderMatch.node.id,
					virtualPath: folderMatch.node.virtualPath,
				});
				return folderMatch;
			}
			current = folderMatch;
			continue;
		}

		const fileMatch = children.find(
			(child): child is Extract<WebDavResource, { kind: "file" }> =>
				isFileResource(child) && child.node.name === segment,
		);
		if (fileMatch && index === segments.length - 1) {
			logger.debug({
				msg: "Resolved WebDAV file resource",
				requestPath: fileMatch.requestPath,
				providerId: fileMatch.provider.id,
				nodeId: fileMatch.node.id,
				virtualPath: fileMatch.node.virtualPath,
			});
			return fileMatch;
		}

		logger.debug({
			msg: "WebDAV path segment not found",
			requestPath,
			segment,
			index,
			currentPath: current.requestPath,
		});
		throw new NotFoundError("WebDAV resource");
	}

	throw new NotFoundError("WebDAV resource");
}
