import { NotFoundError } from "@drivebase/core";
import type { Database, Node, StorageProvider } from "@drivebase/db";
import { files, folders, storageProviders } from "@drivebase/db";
import { and, eq, isNull } from "drizzle-orm";
import { refreshSingleFolderCache } from "@/service/file/query/contents-cache";
import { logger } from "@/utils/runtime/logger";
import {
	ensureTrailingSlash,
	normalizeWebDavRequestPath,
	splitWebDavPath,
	toFolderVirtualPath,
} from "../shared/path";
import type { WebDavResource } from "../shared/resource-types";
import type { WebDavResolvedProviderScope } from "../shared/types";

async function getProviderRecord(
	db: Database,
	workspaceId: string,
	providerId: string,
): Promise<StorageProvider> {
	const [provider] = await db
		.select()
		.from(storageProviders)
		.where(
			and(
				eq(storageProviders.id, providerId),
				eq(storageProviders.workspaceId, workspaceId),
				eq(storageProviders.isActive, true),
			),
		)
		.limit(1);

	if (!provider) {
		throw new NotFoundError("Provider");
	}

	return provider;
}

async function findFolderByVirtualPath(
	db: Database,
	workspaceId: string,
	providerId: string,
	virtualPath: string,
): Promise<Node | null> {
	return db
		.select()
		.from(folders)
		.where(
			and(
				eq(folders.workspaceId, workspaceId),
				eq(folders.providerId, providerId),
				eq(folders.nodeType, "folder"),
				eq(folders.virtualPath, ensureTrailingSlash(virtualPath)),
				eq(folders.isDeleted, false),
				isNull(folders.vaultId),
			),
		)
		.limit(1)
		.then((rows) => rows[0] ?? null);
}

async function ensureFolderPathWarmed(
	db: Database,
	workspaceId: string,
	userId: string,
	provider: StorageProvider,
	virtualPath: string,
): Promise<Node | null> {
	if (virtualPath === "/") {
		logger.debug({
			msg: "Warming WebDAV provider root",
			workspaceId,
			userId,
			providerId: provider.id,
		});
		await refreshSingleFolderCache(
			db,
			workspaceId,
			userId,
			provider,
			undefined,
			null,
			"/",
		);
		return null;
	}

	const segments = splitWebDavPath(virtualPath);
	let parentDbId: string | null = null;
	let remoteFolderId: string | undefined;
	let traversedPath = "/";
	let currentFolder: Node | null = null;

	for (const segment of segments) {
		logger.debug({
			msg: "Warming WebDAV folder segment",
			workspaceId,
			userId,
			providerId: provider.id,
			segment,
			traversedPath,
			parentDbId,
		});
		await refreshSingleFolderCache(
			db,
			workspaceId,
			userId,
			provider as StorageProvider,
			remoteFolderId,
			parentDbId,
			traversedPath,
		);
		traversedPath = ensureTrailingSlash(`${traversedPath}${segment}`);
		currentFolder = await findFolderByVirtualPath(
			db,
			workspaceId,
			provider.id,
			traversedPath,
		);
		if (!currentFolder) {
			logger.debug({
				msg: "WebDAV folder segment not found after warming",
				workspaceId,
				providerId: provider.id,
				traversedPath,
			});
			return null;
		}
		parentDbId = currentFolder.id;
		remoteFolderId = currentFolder.remoteId;
	}

	return currentFolder;
}

async function warmChildren(
	db: Database,
	workspaceId: string,
	userId: string,
	provider: StorageProvider,
	folder: Node | null,
	parentPath: string,
) {
	logger.debug({
		msg: "Warming WebDAV collection children",
		workspaceId,
		userId,
		providerId: provider.id,
		folderId: folder?.id ?? null,
		parentPath,
	});
	await refreshSingleFolderCache(
		db,
		workspaceId,
		userId,
		provider,
		folder?.remoteId,
		folder?.id ?? null,
		toFolderVirtualPath(parentPath),
	);
}

export async function warmWebDavCollection(
	db: Database,
	principal: {
		workspaceId: string;
		userId: string;
	},
	resource: WebDavResource,
) {
	if (resource.kind === "root" || resource.kind === "file") return;
	await warmChildren(
		db,
		principal.workspaceId,
		principal.userId,
		resource.provider as StorageProvider,
		resource.kind === "providerRoot" ? resource.scopeFolder : resource.node,
		resource.kind === "providerRoot"
			? resource.scope.basePath
			: resource.node.virtualPath,
	);
}

export async function listDirectoryChildren(
	db: Database,
	workspaceId: string,
	providerId: string,
	folderId: string | null,
) {
	const [folderRows, fileRows] = await Promise.all([
		db
			.select()
			.from(folders)
			.where(
				and(
					eq(folders.workspaceId, workspaceId),
					eq(folders.providerId, providerId),
					eq(folders.nodeType, "folder"),
					folderId ? eq(folders.parentId, folderId) : isNull(folders.parentId),
					eq(folders.isDeleted, false),
					isNull(folders.vaultId),
				),
			)
			.orderBy(folders.name),
		db
			.select()
			.from(files)
			.where(
				and(
					eq(files.providerId, providerId),
					eq(files.nodeType, "file"),
					folderId ? eq(files.folderId, folderId) : isNull(files.folderId),
					eq(files.isDeleted, false),
					isNull(files.vaultId),
				),
			)
			.orderBy(files.name),
	]);

	return { folders: folderRows, files: fileRows };
}

export async function resolveWebDavResource(
	db: Database,
	principal: {
		workspaceId: string;
		userId: string;
	},
	scopes: WebDavResolvedProviderScope[],
	rawRequestPath: string,
): Promise<WebDavResource> {
	const requestPath = normalizeWebDavRequestPath(rawRequestPath);
	if (requestPath === "/") {
		logger.debug({
			msg: "Resolved WebDAV root resource",
			workspaceId: principal.workspaceId,
			userId: principal.userId,
		});
		return {
			kind: "root",
			requestPath,
			hrefPath: "/",
		};
	}

	const segments = splitWebDavPath(requestPath);
	const [providerSegment, ...remainder] = segments;
	const scope = scopes.find(
		(entry) => entry.providerSegment === providerSegment,
	);
	if (!scope) {
		logger.debug({
			msg: "WebDAV provider segment not in allowed scopes",
			requestPath,
			providerSegment,
			allowedProviderSegments: scopes.map((entry) => entry.providerSegment),
		});
		throw new NotFoundError("WebDAV resource");
	}

	const provider = await getProviderRecord(
		db,
		principal.workspaceId,
		scope.providerId,
	);
	const scopeFolder = await ensureFolderPathWarmed(
		db,
		principal.workspaceId,
		principal.userId,
		provider,
		scope.basePath,
	);

	if (remainder.length === 0) {
		logger.debug({
			msg: "Resolved WebDAV provider root",
			requestPath,
			providerId: provider.id,
			basePath: scope.basePath,
		});
		return {
			kind: "providerRoot",
			requestPath,
			hrefPath: ensureTrailingSlash(`/${providerSegment}`),
			scope,
			provider,
			scopeFolder,
		};
	}

	const relativePath = `/${remainder.join("/")}`;
	const combinedPath =
		scope.basePath === "/"
			? relativePath
			: `${scope.basePath}${relativePath === "/" ? "" : relativePath}`;
	const parentSegments = splitWebDavPath(relativePath).slice(0, -1);
	const targetName = remainder.at(-1) ?? "";
	const parentVirtualPath =
		parentSegments.length === 0
			? scope.basePath
			: `${scope.basePath === "/" ? "" : scope.basePath}/${parentSegments.join("/")}`;
	const parentFolder = await ensureFolderPathWarmed(
		db,
		principal.workspaceId,
		principal.userId,
		provider,
		parentVirtualPath || "/",
	);

	await warmChildren(
		db,
		principal.workspaceId,
		principal.userId,
		provider,
		parentFolder,
		parentVirtualPath || "/",
	);

	const folderVirtualPath = toFolderVirtualPath(combinedPath);
	const folder = await findFolderByVirtualPath(
		db,
		principal.workspaceId,
		provider.id,
		folderVirtualPath,
	);
	if (folder) {
		logger.debug({
			msg: "Resolved WebDAV directory resource",
			requestPath,
			providerId: provider.id,
			nodeId: folder.id,
			virtualPath: folder.virtualPath,
		});
		return {
			kind: "directory",
			requestPath,
			hrefPath: ensureTrailingSlash(requestPath),
			scope,
			provider,
			node: folder,
		};
	}

	const [file] = await db
		.select()
		.from(files)
		.where(
			and(
				eq(files.providerId, provider.id),
				eq(files.nodeType, "file"),
				parentFolder
					? eq(files.folderId, parentFolder.id)
					: isNull(files.folderId),
				eq(files.name, targetName),
				eq(files.isDeleted, false),
				isNull(files.vaultId),
			),
		)
		.limit(1);
	if (!file) {
		logger.debug({
			msg: "WebDAV file resource not found",
			requestPath,
			providerId: provider.id,
			parentVirtualPath,
			targetName,
		});
		throw new NotFoundError("WebDAV resource");
	}

	logger.debug({
		msg: "Resolved WebDAV file resource",
		requestPath,
		providerId: provider.id,
		nodeId: file.id,
		virtualPath: file.virtualPath,
	});
	return {
		kind: "file",
		requestPath,
		hrefPath: requestPath,
		scope,
		provider,
		node: file,
	};
}
