import { NotFoundError } from "@drivebase/core";
import type { Database } from "@drivebase/db";
import {
	files,
	folders,
	storageProviders,
	workspaceAiSettings,
} from "@drivebase/db";
import {
	and,
	desc,
	eq,
	ilike,
	inArray,
	isNull,
	notInArray,
	sql,
} from "drizzle-orm";
import { logger } from "../../utils/logger";
import { resolveAiFeatureToggles } from "../ai/ai-support";
import { inferTextEmbedding } from "../ai/inference-client";
import { getProviderInstance } from "../provider/provider-queries";

function normalizeNullableId(value: string | null | undefined): string | null {
	if (!value) return null;
	const trimmed = value.trim();
	return trimmed.length > 0 ? trimmed : null;
}

async function refreshSingleFolderCache(
	db: Database,
	workspaceId: string,
	userId: string,
	providerRecord: typeof storageProviders.$inferSelect,
	remoteFolderId: string | undefined,
	parentDbId: string | null,
	parentPath: string,
) {
	const provider = await getProviderInstance(providerRecord);
	const normalizedParentDbId = normalizeNullableId(parentDbId);

	try {
		const seenFolderRemoteIds: string[] = [];
		const seenFileRemoteIds: string[] = [];
		let pageToken: string | undefined;

		do {
			const listResult = await provider.list({
				folderId: remoteFolderId,
				pageToken,
				limit: 100,
			});

			for (const folder of listResult.folders) {
				const cleanName = folder.name.replace(/\//g, "-");
				const virtualPath = `${parentPath}${cleanName}/`;
				seenFolderRemoteIds.push(folder.remoteId);

				const [existingFolder] = await db
					.select()
					.from(folders)
					.where(
						and(
							eq(folders.remoteId, folder.remoteId),
							eq(folders.providerId, providerRecord.id),
							eq(folders.nodeType, "folder"),
						),
					)
					.limit(1);

				if (existingFolder) {
					await db
						.update(folders)
						.set({
							name: cleanName,
							virtualPath,
							parentId: normalizedParentDbId,
							updatedAt: folder.modifiedAt,
							isDeleted: false,
						})
						.where(eq(folders.id, existingFolder.id));
				} else {
					await db.insert(folders).values({
						nodeType: "folder",
						name: cleanName,
						virtualPath,
						remoteId: folder.remoteId,
						providerId: providerRecord.id,
						workspaceId,
						parentId: normalizedParentDbId,
						createdBy: userId,
						updatedAt: folder.modifiedAt,
						createdAt: folder.modifiedAt,
						isDeleted: false,
					});
				}
			}

			for (const file of listResult.files) {
				const cleanName = file.name.replace(/\//g, "-");
				const virtualPath = `${parentPath}${cleanName}`;
				seenFileRemoteIds.push(file.remoteId);

				const [existingFile] = await db
					.select()
					.from(files)
					.where(
						and(
							eq(files.remoteId, file.remoteId),
							eq(files.providerId, providerRecord.id),
							eq(files.nodeType, "file"),
						),
					)
					.limit(1);

				if (existingFile) {
					await db
						.update(files)
						.set({
							name: cleanName,
							virtualPath,
							mimeType: file.mimeType,
							size: file.size,
							hash: file.hash,
							folderId: normalizedParentDbId,
							updatedAt: file.modifiedAt,
							isDeleted: false,
						})
						.where(eq(files.id, existingFile.id));
				} else {
					const [existingPathFile] = await db
						.select()
						.from(files)
						.where(
							and(
								eq(files.virtualPath, virtualPath),
								eq(files.providerId, providerRecord.id),
								eq(files.nodeType, "file"),
								isNull(files.vaultId),
							),
						)
						.limit(1);

					if (existingPathFile) {
						await db
							.update(files)
							.set({
								name: cleanName,
								virtualPath,
								mimeType: file.mimeType,
								size: file.size,
								hash: file.hash,
								remoteId: file.remoteId,
								folderId: normalizedParentDbId,
								uploadedBy: userId,
								updatedAt: file.modifiedAt,
								createdAt: file.modifiedAt,
								isDeleted: false,
							})
							.where(eq(files.id, existingPathFile.id));
					} else {
						await db.insert(files).values({
							nodeType: "file",
							name: cleanName,
							virtualPath,
							mimeType: file.mimeType,
							size: file.size,
							hash: file.hash,
							remoteId: file.remoteId,
							providerId: providerRecord.id,
							folderId: normalizedParentDbId,
							uploadedBy: userId,
							updatedAt: file.modifiedAt,
							createdAt: file.modifiedAt,
							isDeleted: false,
						});
					}
				}
			}

			pageToken = listResult.nextPageToken;
		} while (pageToken);

		const fileScope = [
			eq(files.nodeType, "file"),
			eq(files.providerId, providerRecord.id),
			isNull(files.vaultId),
			normalizedParentDbId
				? eq(files.folderId, normalizedParentDbId)
				: isNull(files.folderId),
		] as const;

		if (seenFileRemoteIds.length > 0) {
			await db
				.delete(files)
				.where(
					and(...fileScope, notInArray(files.remoteId, seenFileRemoteIds)),
				);
		} else {
			await db.delete(files).where(and(...fileScope));
		}

		const folderScope = [
			eq(folders.nodeType, "folder"),
			eq(folders.providerId, providerRecord.id),
			eq(folders.workspaceId, workspaceId),
			isNull(folders.vaultId),
			normalizedParentDbId
				? eq(folders.parentId, normalizedParentDbId)
				: isNull(folders.parentId),
		] as const;

		if (seenFolderRemoteIds.length > 0) {
			await db
				.delete(folders)
				.where(
					and(
						...folderScope,
						notInArray(folders.remoteId, seenFolderRemoteIds),
					),
				);
		} else {
			await db.delete(folders).where(and(...folderScope));
		}
	} finally {
		await provider.cleanup();
	}
}

async function hasCachedRootItemsForProvider(
	db: Database,
	workspaceId: string,
	providerId: string,
) {
	const [rootFiles, rootFolders] = await Promise.all([
		db
			.select({ id: files.id })
			.from(files)
			.where(
				and(
					eq(files.providerId, providerId),
					eq(files.nodeType, "file"),
					eq(files.isDeleted, false),
					isNull(files.vaultId),
					isNull(files.folderId),
				),
			)
			.limit(1),
		db
			.select({ id: folders.id })
			.from(folders)
			.where(
				and(
					eq(folders.providerId, providerId),
					eq(folders.nodeType, "folder"),
					eq(folders.workspaceId, workspaceId),
					eq(folders.isDeleted, false),
					isNull(folders.vaultId),
					isNull(folders.parentId),
				),
			)
			.limit(1),
	]);

	return rootFiles.length > 0 || rootFolders.length > 0;
}

async function hasCachedChildrenForFolder(
	db: Database,
	workspaceId: string,
	providerId: string,
	folderId: string,
) {
	const [childFiles, childFolders] = await Promise.all([
		db
			.select({ id: files.id })
			.from(files)
			.where(
				and(
					eq(files.providerId, providerId),
					eq(files.nodeType, "file"),
					eq(files.folderId, folderId),
					eq(files.isDeleted, false),
					isNull(files.vaultId),
				),
			)
			.limit(1),
		db
			.select({ id: folders.id })
			.from(folders)
			.where(
				and(
					eq(folders.providerId, providerId),
					eq(folders.nodeType, "folder"),
					eq(folders.workspaceId, workspaceId),
					eq(folders.parentId, folderId),
					eq(folders.isDeleted, false),
					isNull(folders.vaultId),
				),
			)
			.limit(1),
	]);

	return childFiles.length > 0 || childFolders.length > 0;
}

/**
 * Get file by ID (excludes vault files)
 */
export async function getFile(
	db: Database,
	fileId: string,
	_userId: string,
	workspaceId: string,
) {
	const [file] = await db
		.select()
		.from(files)
		.innerJoin(storageProviders, eq(storageProviders.id, files.providerId))
		.where(
			and(
				eq(files.id, fileId),
				eq(files.nodeType, "file"),
				eq(files.isDeleted, false),
				isNull(files.vaultId),
				eq(storageProviders.workspaceId, workspaceId),
			),
		)
		.limit(1);

	if (!file?.nodes) {
		throw new NotFoundError("File");
	}

	return file.nodes;
}

/**
 * Get file by ID for proxy upload/download — includes vault files.
 * Used by the upload/download proxy handlers which serve both regular and vault files.
 */
export async function getFileForProxy(
	db: Database,
	fileId: string,
	workspaceId: string,
) {
	const [file] = await db
		.select()
		.from(files)
		.innerJoin(storageProviders, eq(storageProviders.id, files.providerId))
		.where(
			and(
				eq(files.id, fileId),
				eq(files.nodeType, "file"),
				eq(files.isDeleted, false),
				eq(storageProviders.workspaceId, workspaceId),
			),
		)
		.limit(1);

	if (!file?.nodes) {
		throw new NotFoundError("File");
	}

	return file.nodes;
}

/**
 * List files in a folder (excludes vault files)
 */
export async function listFiles(
	db: Database,
	userId: string,
	workspaceId: string,
	folderId?: string,
	limit: number = 50,
	offset: number = 0,
) {
	logger.debug({
		msg: "Listing files",
		userId,
		workspaceId,
		folderId,
		limit,
		offset,
	});

	try {
		const fileList = folderId
			? await db
					.select({ file: files })
					.from(files)
					.innerJoin(
						storageProviders,
						eq(storageProviders.id, files.providerId),
					)
					.where(
						and(
							eq(files.nodeType, "file"),
							eq(files.folderId, folderId),
							eq(files.isDeleted, false),
							isNull(files.vaultId),
							eq(storageProviders.workspaceId, workspaceId),
						),
					)
					.limit(limit)
					.offset(offset)
					.orderBy(desc(files.createdAt))
					.then((rows) => rows.map((row) => row.file))
			: await db
					.select({ file: files })
					.from(files)
					.innerJoin(
						storageProviders,
						eq(storageProviders.id, files.providerId),
					)
					.where(
						and(
							eq(files.nodeType, "file"),
							isNull(files.folderId),
							eq(files.isDeleted, false),
							isNull(files.vaultId),
							eq(storageProviders.workspaceId, workspaceId),
						),
					)
					.limit(limit)
					.offset(offset)
					.orderBy(desc(files.createdAt))
					.then((rows) => rows.map((row) => row.file));

		const total = fileList.length;

		return {
			files: fileList,
			total,
			hasMore: fileList.length === limit,
		};
	} catch (error) {
		logger.error({ msg: "List files failed", userId, folderId, error });
		throw error;
	}
}

/**
 * Search files by name (excludes vault files)
 */
export async function searchFiles(
	db: Database,
	userId: string,
	workspaceId: string,
	query: string,
	limit: number = 50,
) {
	logger.debug({ msg: "Searching files", userId, workspaceId, query });
	const searchPattern = `%${query}%`;

	try {
		return await db
			.select({ file: files })
			.from(files)
			.innerJoin(storageProviders, eq(storageProviders.id, files.providerId))
			.where(
				and(
					eq(files.nodeType, "file"),
					ilike(files.name, searchPattern),
					eq(files.isDeleted, false),
					isNull(files.vaultId),
					eq(storageProviders.workspaceId, workspaceId),
				),
			)
			.limit(limit)
			.orderBy(files.name)
			.then((rows) => rows.map((row) => row.file));
	} catch (error) {
		logger.error({ msg: "Search files failed", userId, query, error });
		throw error;
	}
}

function toVectorLiteral(values: number[]): string {
	return `[${values.join(",")}]`;
}

type AiSearchIntent = "general" | "image" | "document";

function detectAiSearchIntent(query: string): AiSearchIntent {
	const normalized = query.toLowerCase();
	const imageHints =
		/\b(image|images|photo|photos|picture|pictures|pic|screenshot|logo|icon|person|people|woman|women|female|girl|lady|man|men|male|boy|guy)\b/.test(
			normalized,
		);
	const documentHints =
		/\b(pdf|document|documents|doc|docs|report|contract|invoice|text|notes)\b/.test(
			normalized,
		);

	if (imageHints && !documentHints) return "image";
	if (documentHints && !imageHints) return "document";
	return "general";
}

function getMimeFilterSql(intent: AiSearchIntent) {
	if (intent === "image") {
		return sql`f.mime_type like 'image/%'`;
	}
	if (intent === "document") {
		return sql`(
			f.mime_type = 'application/pdf'
			or f.mime_type like 'text/%'
			or f.mime_type in ('application/json', 'application/csv')
			or f.mime_type like 'application/vnd.openxmlformats-officedocument%'
			or f.mime_type like 'application/msword%'
		)`;
	}
	return sql`true`;
}

const AI_MIN_RELEVANCE_SCORE = 0.12;
const AI_MIN_HIGH_CONF_SEMANTIC_SCORE = 0.72;

function tokenizeQuery(query: string): string[] {
	return Array.from(
		new Set(
			query
				.toLowerCase()
				.split(/[^a-z0-9]+/g)
				.map((token) => token.trim())
				.filter((token) => token.length >= 2),
		),
	).slice(0, 10);
}

async function searchFilesAiLexicalFallback(
	db: Database,
	workspaceId: string,
	query: string,
	limit: number,
) {
	const queryLike = `%${query.toLowerCase()}%`;
	const queryTokens = tokenizeQuery(query);
	const tokenValues =
		queryTokens.length > 0
			? sql.join(
					queryTokens.map((token) => sql`(${token})`),
					sql`,`,
				)
			: sql`('')`;
	const hasQueryRoot = query.trim().length >= 6;
	const personAliasMatch =
		/\b(person|people|woman|women|female|girl|lady|man|men|male|boy|guy)\b/.test(
			query.toLowerCase(),
		);
	const queryRoot = hasQueryRoot
		? `%${query
				.trim()
				.toLowerCase()
				.replace(/[^a-z0-9]/g, "")
				.slice(0, 6)}%`
		: queryLike;
	const rows = await db.execute(sql`
		with workspace_files as (
			select f.id, f.name
			from nodes f
			join storage_providers sp on sp.id = f.provider_id
			where f.node_type = 'file'
				and f.is_deleted = false
				and f.vault_id is null
				and sp.workspace_id = ${workspaceId}
		),
		query_tokens(token) as (
			values ${tokenValues}
		),
		name_hits as (
			select
				wf.id as file_id,
				greatest(
					case when lower(wf.name) like ${queryLike} then 1.0 else 0 end,
					case when ${hasQueryRoot} and lower(wf.name) like ${queryRoot} then 0.65 else 0 end
				)::float4 as score
			from workspace_files wf
			where lower(wf.name) like ${queryLike}
				or (${hasQueryRoot} and lower(wf.name) like ${queryRoot})
		),
		text_hits as (
			select
				fet.file_id,
				greatest(
					case when lower(fet.text) like ${queryLike} then 1.2 else 0 end,
					case when ${hasQueryRoot} and lower(fet.text) like ${queryRoot} then 0.85 else 0 end
				)::float4 as score
			from file_extracted_text fet
			join workspace_files wf on wf.id = fet.file_id
			where fet.workspace_id = ${workspaceId}
				and (
					lower(fet.text) like ${queryLike}
					or (${hasQueryRoot} and lower(fet.text) like ${queryRoot})
				)
		),
		text_token_hits as (
			select
				fet.file_id,
				least(
					1.3::float4,
					(count(distinct qt.token)::float4 / greatest(1, ${queryTokens.length})::float4) * 1.3
				) as score
			from file_extracted_text fet
			join workspace_files wf on wf.id = fet.file_id
			join query_tokens qt on length(qt.token) >= 2
			where fet.workspace_id = ${workspaceId}
				and lower(fet.text) like ('%' || qt.token || '%')
			group by fet.file_id
		),
		object_hits as (
			select
				fdo.file_id,
				greatest(
					case when lower(fdo.label) like ${queryLike} then 1.1 else 0 end,
					case when ${hasQueryRoot} and lower(fdo.label) like ${queryRoot} then 0.8 else 0 end,
					case when ${personAliasMatch} and lower(fdo.label) = 'person' then 1.15 else 0 end
				)::float4 as score
			from file_detected_objects fdo
			join workspace_files wf on wf.id = fdo.file_id
			where fdo.workspace_id = ${workspaceId}
				and (
					lower(fdo.label) like ${queryLike}
					or (${hasQueryRoot} and lower(fdo.label) like ${queryRoot})
					or (${personAliasMatch} and lower(fdo.label) = 'person')
				)
		),
		scored as (
			select file_id, max(score)::float4 as score
			from (
				select * from name_hits
				union all
				select * from text_hits
				union all
				select * from text_token_hits
				union all
				select * from object_hits
			) all_hits
			group by file_id
		)
		select file_id as id
		from scored
		order by score desc
		limit ${limit}
	`);

	const rankedIds = rows.rows
		.map((row) => (row as { id?: unknown }).id)
		.filter((id): id is string => typeof id === "string");

	if (rankedIds.length === 0) {
		return [];
	}

	const rankedFiles = await db
		.select({ file: files })
		.from(files)
		.where(inArray(files.id, rankedIds))
		.then((resultRows) => resultRows.map((resultRow) => resultRow.file));

	const rankedFilesById = new Map(rankedFiles.map((file) => [file.id, file]));
	return rankedIds
		.map((id) => rankedFilesById.get(id))
		.filter((file): file is typeof files.$inferSelect => Boolean(file));
}

/**
 * Semantic search files using vector similarity. Falls back to name search if
 * embedding inference is unavailable.
 */
export async function searchFilesAi(
	db: Database,
	userId: string,
	workspaceId: string,
	query: string,
	limit: number = 20,
) {
	logger.debug({ msg: "Semantic searching files", userId, workspaceId, query });
	const normalizedQuery = query.trim();
	if (normalizedQuery.length < 3) {
		logger.debug({
			msg: "Short query routed to lexical AI search",
			workspaceId,
			query,
		});
		return searchFilesAiLexicalFallback(db, workspaceId, query, limit);
	}
	try {
		const intent = detectAiSearchIntent(query);
		const mimeFilterSql = getMimeFilterSql(intent);
		const [aiSettings] = await db
			.select({
				embeddingTier: workspaceAiSettings.embeddingTier,
				config: workspaceAiSettings.config,
			})
			.from(workspaceAiSettings)
			.where(eq(workspaceAiSettings.workspaceId, workspaceId))
			.limit(1);
		const featureToggles = resolveAiFeatureToggles(aiSettings?.config);
		if (!featureToggles.embedding) {
			return searchFilesAiLexicalFallback(db, workspaceId, query, limit);
		}

		const embed = await inferTextEmbedding({
			text: query,
			modelTier: aiSettings?.embeddingTier ?? "medium",
		});
		const vectorLiteral = toVectorLiteral(embed.embedding);
		const queryLike = `%${query.toLowerCase()}%`;
		const personAliasMatch =
			/\b(person|people|woman|women|female|girl|lady|man|men|male|boy|guy)\b/.test(
				query.toLowerCase(),
			);
		const queryRoot =
			query.trim().length >= 6
				? `%${query
						.trim()
						.toLowerCase()
						.replace(/[^a-z0-9]/g, "")
						.slice(0, 6)}%`
				: null;

		const rows = await db.execute(sql`
			with query_params as (
				select
					plainto_tsquery('simple', ${query}) as qts,
					${queryLike}::text as qlike,
					${queryRoot}::text as qroot,
					${personAliasMatch}::boolean as qperson
			),
			workspace_files as (
				select f.id, f.name, f.mime_type
				from nodes f
				join storage_providers sp on sp.id = f.provider_id
				where f.node_type = 'file'
					and f.is_deleted = false
					and f.vault_id is null
					and sp.workspace_id = ${workspaceId}
					and ${mimeFilterSql}
			),
			latest_file_embeddings as (
				select distinct on (fe.file_id) fe.file_id, fe.embedding
				from file_embeddings fe
				join workspace_files wf on wf.id = fe.file_id
				where fe.workspace_id = ${workspaceId}
				order by fe.file_id, fe.created_at desc
			),
			latest_chunk_embeddings as (
				select distinct on (fc.file_id, fc.chunk_index)
					fc.file_id,
					fc.chunk_index,
					fc.embedding
				from file_text_chunks fc
				join workspace_files wf on wf.id = fc.file_id
				where fc.workspace_id = ${workspaceId}
				order by fc.file_id, fc.chunk_index, fc.created_at desc
			),
			semantic_file as (
				select
					lf.file_id,
					greatest(0::float4, 1 - (lf.embedding <=> ${sql.raw(`'${vectorLiteral}'::vector`)}))::float4 as score
				from latest_file_embeddings lf
				order by lf.embedding <=> ${sql.raw(`'${vectorLiteral}'::vector`)} asc
				limit 250
			),
			semantic_chunk as (
				select
					lc.file_id,
					max(greatest(0::float4, 1 - (lc.embedding <=> ${sql.raw(`'${vectorLiteral}'::vector`)}))::float4) as score
				from latest_chunk_embeddings lc
				group by lc.file_id
				order by max(lc.embedding <=> ${sql.raw(`'${vectorLiteral}'::vector`)}) asc
				limit 250
			),
			lexical_name as (
				select
					wf.id as file_id,
					greatest(
						ts_rank_cd(to_tsvector('simple', coalesce(wf.name, '')), qp.qts),
						case when lower(wf.name) like qp.qlike then 0.7 else 0 end,
						case when qp.qroot is not null and lower(wf.name) like qp.qroot then 0.45 else 0 end
					)::float4 as score
				from workspace_files wf
				cross join query_params qp
				where to_tsvector('simple', coalesce(wf.name, '')) @@ qp.qts
					or lower(wf.name) like qp.qlike
					or (qp.qroot is not null and lower(wf.name) like qp.qroot)
				order by score desc
				limit 250
			),
			lexical_text as (
				select
					fet.file_id,
					max(
						greatest(
							ts_rank_cd(to_tsvector('simple', coalesce(fet.text, '')), qp.qts),
							case when lower(fet.text) like qp.qlike then 0.8 else 0 end,
							case when qp.qroot is not null and lower(fet.text) like qp.qroot then 0.5 else 0 end
						)
					)::float4 as score
				from file_extracted_text fet
				join workspace_files wf on wf.id = fet.file_id
				cross join query_params qp
				where fet.workspace_id = ${workspaceId}
					and (
						to_tsvector('simple', coalesce(fet.text, '')) @@ qp.qts
						or lower(fet.text) like qp.qlike
						or (qp.qroot is not null and lower(fet.text) like qp.qroot)
					)
				group by fet.file_id
				order by score desc
				limit 250
			),
			lexical_objects as (
				select
					fdo.file_id,
					max(
						greatest(
							ts_rank_cd(to_tsvector('simple', coalesce(fdo.label, '')), qp.qts),
							case when lower(fdo.label) like qp.qlike then 0.8 else 0 end,
							case when qp.qroot is not null and lower(fdo.label) like qp.qroot then 0.5 else 0 end,
							case when qp.qperson and lower(fdo.label) = 'person' then 0.9 else 0 end
						)
					)::float4 as score
				from file_detected_objects fdo
				join workspace_files wf on wf.id = fdo.file_id
				cross join query_params qp
				where fdo.workspace_id = ${workspaceId}
					and (
						to_tsvector('simple', coalesce(fdo.label, '')) @@ qp.qts
						or lower(fdo.label) like qp.qlike
						or (qp.qroot is not null and lower(fdo.label) like qp.qroot)
						or (qp.qperson and lower(fdo.label) = 'person')
					)
				group by fdo.file_id
				order by score desc
				limit 250
			),
			candidate_ids as (
				select file_id from semantic_file
				union
				select file_id from semantic_chunk
				union
				select file_id from lexical_name
				union
				select file_id from lexical_text
				union
				select file_id from lexical_objects
			),
			ranked as (
				select
					c.file_id as id,
					greatest(coalesce(sf.score, 0), coalesce(sc.score, 0))::float4 as semantic_score,
					(coalesce(lt.score, 0) + coalesce(ln.score, 0) + coalesce(lo.score, 0))::float4 as lexical_score,
					(
						0.55 * greatest(coalesce(sf.score, 0), coalesce(sc.score, 0))
						+ 0.25 * least(1.0, coalesce(lt.score, 0))
						+ 0.1 * least(1.0, coalesce(ln.score, 0))
						+ 0.1 * least(1.0, coalesce(lo.score, 0))
					)::float4 as hybrid_score
				from candidate_ids c
				left join semantic_file sf on sf.file_id = c.file_id
				left join semantic_chunk sc on sc.file_id = c.file_id
				left join lexical_name ln on ln.file_id = c.file_id
				left join lexical_text lt on lt.file_id = c.file_id
				left join lexical_objects lo on lo.file_id = c.file_id
			)
			select r.id
			from ranked r
			where r.hybrid_score >= ${AI_MIN_RELEVANCE_SCORE}
				and (
					r.lexical_score > 0
					or r.semantic_score >= ${AI_MIN_HIGH_CONF_SEMANTIC_SCORE}
				)
			order by r.hybrid_score desc
			limit ${limit}
		`);

		const rankedIds = rows.rows
			.map((row) => (row as { id?: unknown }).id)
			.filter((id): id is string => typeof id === "string");

		if (rankedIds.length === 0) {
			logger.debug({
				msg: "No semantic candidates passed relevance threshold; falling back to lexical search",
				workspaceId,
				query,
				intent,
			});
			return searchFilesAiLexicalFallback(db, workspaceId, query, limit);
		}

		const rankedFiles = await db
			.select({ file: files })
			.from(files)
			.where(inArray(files.id, rankedIds))
			.then((resultRows) => resultRows.map((resultRow) => resultRow.file));

		const rankedFilesById = new Map(rankedFiles.map((file) => [file.id, file]));
		return rankedIds
			.map((id) => rankedFilesById.get(id))
			.filter((file): file is typeof files.$inferSelect => Boolean(file));
	} catch (error) {
		logger.warn({
			msg: "Semantic search unavailable, falling back to lexical AI search",
			workspaceId,
			error: error instanceof Error ? error.message : String(error),
		});
		return searchFilesAiLexicalFallback(db, workspaceId, query, limit);
	}
}

/**
 * Search folders by name (excludes vault folders)
 */
export async function searchFolders(
	db: Database,
	userId: string,
	workspaceId: string,
	query: string,
	limit: number = 50,
) {
	logger.debug({ msg: "Searching folders", userId, workspaceId, query });
	const searchPattern = `%${query}%`;

	try {
		return await db
			.select({ folder: folders })
			.from(folders)
			.innerJoin(storageProviders, eq(storageProviders.id, folders.providerId))
			.where(
				and(
					eq(folders.nodeType, "folder"),
					ilike(folders.name, searchPattern),
					eq(folders.isDeleted, false),
					isNull(folders.vaultId),
					eq(storageProviders.workspaceId, workspaceId),
				),
			)
			.limit(limit)
			.orderBy(folders.name)
			.then((rows) => rows.map((row) => row.folder));
	} catch (error) {
		logger.error({ msg: "Search folders failed", userId, query, error });
		throw error;
	}
}

/**
 * Get recent files ordered by most recent create/update timestamp (excludes vault files)
 */
export async function getRecentFiles(
	db: Database,
	userId: string,
	workspaceId: string,
	limit: number = 3,
) {
	logger.debug({ msg: "Listing recent files", userId, workspaceId, limit });

	try {
		return await db
			.select({ file: files })
			.from(files)
			.innerJoin(storageProviders, eq(storageProviders.id, files.providerId))
			.where(
				and(
					eq(files.nodeType, "file"),
					eq(files.isDeleted, false),
					isNull(files.vaultId),
					eq(storageProviders.workspaceId, workspaceId),
				),
			)
			.limit(limit)
			.orderBy(
				desc(sql`GREATEST(${files.updatedAt}, ${files.createdAt})`),
				desc(files.updatedAt),
				desc(files.createdAt),
			)
			.then((rows) => rows.map((row) => row.file));
	} catch (error) {
		logger.error({ msg: "List recent files failed", userId, error });
		throw error;
	}
}

/**
 * Get files and folders at a location (excludes vault files and vault folders).
 * folderId = undefined returns root-level content.
 * providerIds filters results to specific providers.
 */
export async function getContents(
	db: Database,
	workspaceId: string,
	userId: string,
	folderId?: string,
	providerIds?: string[],
) {
	const isRoot = !folderId;

	if (isRoot) {
		const providerConditions = [
			eq(storageProviders.workspaceId, workspaceId),
			eq(storageProviders.isActive, true),
		];

		if (providerIds && providerIds.length > 0) {
			providerConditions.push(inArray(storageProviders.id, providerIds));
		}

		const providerRecords = await db
			.select()
			.from(storageProviders)
			.where(and(...providerConditions));

		await Promise.all(
			providerRecords.map(async (providerRecord) => {
				const hasCached = await hasCachedRootItemsForProvider(
					db,
					workspaceId,
					providerRecord.id,
				);

				if (hasCached) {
					return;
				}

				await refreshSingleFolderCache(
					db,
					workspaceId,
					userId,
					providerRecord,
					undefined,
					null,
					"/",
				);
			}),
		);
	}

	if (isRoot) {
		const fileConditions = [
			eq(files.nodeType, "file"),
			isNull(files.folderId),
			eq(files.isDeleted, false),
			isNull(files.vaultId),
			eq(storageProviders.workspaceId, workspaceId),
		];
		if (providerIds && providerIds.length > 0) {
			fileConditions.push(inArray(files.providerId, providerIds));
		}

		const folderConditions = [
			eq(folders.nodeType, "folder"),
			isNull(folders.parentId),
			eq(folders.isDeleted, false),
			isNull(folders.vaultId),
			eq(folders.workspaceId, workspaceId),
		];
		if (providerIds && providerIds.length > 0) {
			folderConditions.push(inArray(folders.providerId, providerIds));
		}

		const [fileList, folderList] = await Promise.all([
			db
				.select({ file: files })
				.from(files)
				.innerJoin(storageProviders, eq(storageProviders.id, files.providerId))
				.where(and(...fileConditions))
				.orderBy(files.name)
				.then((rows) => rows.map((row) => row.file)),
			db
				.select()
				.from(folders)
				.where(and(...folderConditions))
				.orderBy(folders.name),
		]);

		return { files: fileList, folders: folderList, folder: null };
	}

	const [targetFolder] = await db
		.select()
		.from(folders)
		.where(
			and(
				eq(folders.id, folderId),
				eq(folders.nodeType, "folder"),
				eq(folders.isDeleted, false),
				isNull(folders.vaultId),
				eq(folders.workspaceId, workspaceId),
			),
		)
		.limit(1);

	if (!targetFolder) {
		return { files: [], folders: [], folder: null };
	}

	if (!providerIds || providerIds.includes(targetFolder.providerId)) {
		const [providerRecord] = await db
			.select()
			.from(storageProviders)
			.where(
				and(
					eq(storageProviders.id, targetFolder.providerId),
					eq(storageProviders.workspaceId, workspaceId),
					eq(storageProviders.isActive, true),
				),
			)
			.limit(1);

		if (providerRecord) {
			const hasCachedChildren = await hasCachedChildrenForFolder(
				db,
				workspaceId,
				providerRecord.id,
				targetFolder.id,
			);

			if (!hasCachedChildren) {
				await refreshSingleFolderCache(
					db,
					workspaceId,
					userId,
					providerRecord,
					targetFolder.remoteId,
					targetFolder.id,
					targetFolder.virtualPath,
				);
			}
		}
	}

	const fileConditions = [
		eq(files.nodeType, "file"),
		eq(files.folderId, targetFolder.id),
		eq(files.isDeleted, false),
		isNull(files.vaultId),
		eq(storageProviders.workspaceId, workspaceId),
	];
	if (providerIds && providerIds.length > 0) {
		fileConditions.push(inArray(files.providerId, providerIds));
	}

	const folderConditions = [
		eq(folders.nodeType, "folder"),
		eq(folders.parentId, targetFolder.id),
		eq(folders.isDeleted, false),
		isNull(folders.vaultId),
		eq(folders.workspaceId, workspaceId),
	];
	if (providerIds && providerIds.length > 0) {
		folderConditions.push(inArray(folders.providerId, providerIds));
	}

	const [fileList, folderList] = await Promise.all([
		db
			.select({ file: files })
			.from(files)
			.innerJoin(storageProviders, eq(storageProviders.id, files.providerId))
			.where(and(...fileConditions))
			.orderBy(files.name)
			.then((rows) => rows.map((row) => row.file)),
		db
			.select()
			.from(folders)
			.where(and(...folderConditions))
			.orderBy(folders.name),
	]);

	return { files: fileList, folders: folderList, folder: targetFolder };
}

/**
 * Get starred files (excludes vault files)
 */
export async function getStarredFiles(
	db: Database,
	_userId: string,
	workspaceId: string,
) {
	return db
		.select({ file: files })
		.from(files)
		.innerJoin(storageProviders, eq(storageProviders.id, files.providerId))
		.where(
			and(
				eq(files.nodeType, "file"),
				eq(files.starred, true),
				eq(files.isDeleted, false),
				isNull(files.vaultId),
				eq(storageProviders.workspaceId, workspaceId),
			),
		)
		.orderBy(desc(files.updatedAt))
		.then((rows) => rows.map((row) => row.file));
}
