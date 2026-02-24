import type { Database } from "@drivebase/db";
import {
	activities,
	files,
	storageProviders,
	workspaceStats,
} from "@drivebase/db";
import { and, eq, gte, inArray, lt, sql } from "drizzle-orm";

const MAX_RANGE_DAYS = 365;
const DEFAULT_RANGE_DAYS = 30;

function clampDays(days?: number): number {
	if (!days || Number.isNaN(days)) return DEFAULT_RANGE_DAYS;
	return Math.max(1, Math.min(MAX_RANGE_DAYS, Math.floor(days)));
}

function startOfUtcDay(date: Date): Date {
	return new Date(
		Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()),
	);
}

function addDaysUtc(date: Date, days: number): Date {
	return new Date(date.getTime() + days * 24 * 60 * 60 * 1000);
}

function toNumber(value: unknown): number {
	if (typeof value === "number") return value;
	if (typeof value === "string") return Number(value);
	if (typeof value === "bigint") return Number(value);
	return 0;
}

function toDayKey(date: Date): string {
	return date.toISOString().slice(0, 10);
}

function rangeBuckets(start: Date, endExclusive: Date): Date[] {
	const buckets: Date[] = [];
	for (
		let cursor = start;
		cursor < endExclusive;
		cursor = addDaysUtc(cursor, 1)
	) {
		buckets.push(cursor);
	}
	return buckets;
}

async function upsertWorkspaceStatsRange(
	db: Database,
	workspaceId: string,
	start: Date,
	endExclusive: Date,
) {
	const aggregated = await db
		.select({
			bucketStart: sql<Date>`date_trunc('day', ${activities.createdAt} AT TIME ZONE 'UTC')::timestamptz`,
			uploadedBytes: sql<number>`coalesce(sum(case when ${activities.type} = 'upload' then ${activities.bytes} else 0 end), 0)::bigint`,
			downloadedBytes: sql<number>`coalesce(sum(case when ${activities.type} = 'download' then ${activities.bytes} else 0 end), 0)::bigint`,
		})
		.from(activities)
		.where(
			and(
				eq(activities.workspaceId, workspaceId),
				inArray(activities.type, ["upload", "download"]),
				gte(activities.createdAt, start),
				lt(activities.createdAt, endExclusive),
			),
		)
		.groupBy(
			sql`date_trunc('day', ${activities.createdAt} AT TIME ZONE 'UTC')::timestamptz`,
		);

	const byDay = new Map<
		string,
		{ uploadedBytes: number; downloadedBytes: number }
	>();
	for (const row of aggregated) {
		const bucket = startOfUtcDay(new Date(row.bucketStart));
		byDay.set(toDayKey(bucket), {
			uploadedBytes: toNumber(row.uploadedBytes),
			downloadedBytes: toNumber(row.downloadedBytes),
		});
	}

	const upsertRows = rangeBuckets(start, endExclusive).map((bucketStart) => {
		const day = toDayKey(bucketStart);
		const values = byDay.get(day) ?? { uploadedBytes: 0, downloadedBytes: 0 };
		return {
			workspaceId,
			bucketStart,
			uploadedBytes: values.uploadedBytes,
			downloadedBytes: values.downloadedBytes,
			updatedAt: new Date(),
		};
	});

	if (upsertRows.length === 0) return;

	await db
		.insert(workspaceStats)
		.values(upsertRows)
		.onConflictDoUpdate({
			target: [workspaceStats.workspaceId, workspaceStats.bucketStart],
			set: {
				uploadedBytes: sql`excluded.uploaded_bytes`,
				downloadedBytes: sql`excluded.downloaded_bytes`,
				updatedAt: new Date(),
			},
		});
}

export async function getWorkspaceStats(
	db: Database,
	workspaceId: string,
	days?: number,
) {
	const rangeDays = clampDays(days);
	const endExclusive = addDaysUtc(startOfUtcDay(new Date()), 1);
	const start = addDaysUtc(endExclusive, -rangeDays);

	await upsertWorkspaceStatsRange(db, workspaceId, start, endExclusive);

	const [currentStorage] = await db
		.select({
			totalFiles: sql<number>`count(*)::bigint`,
			totalSizeBytes: sql<number>`coalesce(sum(${files.size}), 0)::bigint`,
		})
		.from(files)
		.innerJoin(storageProviders, eq(storageProviders.id, files.providerId))
		.where(
			and(
				eq(files.nodeType, "file"),
				eq(files.isDeleted, false),
				eq(storageProviders.workspaceId, workspaceId),
			),
		);

	const [providerTotals] = await db
		.select({
			totalProviders: sql<number>`count(*)::bigint`,
		})
		.from(storageProviders)
		.where(
			and(
				eq(storageProviders.workspaceId, workspaceId),
				eq(storageProviders.isActive, true),
			),
		);

	const buckets = await db
		.select({
			bucketStart: workspaceStats.bucketStart,
			uploadedBytes: workspaceStats.uploadedBytes,
			downloadedBytes: workspaceStats.downloadedBytes,
		})
		.from(workspaceStats)
		.where(
			and(
				eq(workspaceStats.workspaceId, workspaceId),
				gte(workspaceStats.bucketStart, start),
				lt(workspaceStats.bucketStart, endExclusive),
			),
		)
		.orderBy(workspaceStats.bucketStart);

	const history = buckets.map((bucket) => {
		const uploadedBytes = toNumber(bucket.uploadedBytes);
		const downloadedBytes = toNumber(bucket.downloadedBytes);
		return {
			bucketStart: bucket.bucketStart,
			uploadedBytes,
			downloadedBytes,
			bandwidthBytes: uploadedBytes + downloadedBytes,
		};
	});

	const uploadedBytes = history.reduce(
		(sum, bucket) => sum + bucket.uploadedBytes,
		0,
	);
	const downloadedBytes = history.reduce(
		(sum, bucket) => sum + bucket.downloadedBytes,
		0,
	);

	return {
		workspaceId,
		days: rangeDays,
		totalFiles: toNumber(currentStorage?.totalFiles),
		totalSizeBytes: toNumber(currentStorage?.totalSizeBytes),
		totalProviders: toNumber(providerTotals?.totalProviders),
		uploadedBytes,
		downloadedBytes,
		bandwidthBytes: uploadedBytes + downloadedBytes,
		buckets: history,
	};
}
