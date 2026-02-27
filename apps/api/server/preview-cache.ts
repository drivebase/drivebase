import { mkdir, readFile, stat, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import { join } from "node:path";
import { env } from "../config/env";

/** Max file size written to the preview cache (10 MB) */
const MAX_CACHE_BYTES = 10 * 1024 * 1024;

interface CacheMeta {
	mimeType: string;
	name: string;
}

export interface CachedPreview {
	data: Uint8Array;
	mimeType: string;
	name: string;
}

function resolveCacheDir(): string {
	if (env.NODE_ENV === "production") {
		return join(env.DATA_DIR, "preview-cache");
	}
	// Local dev: use OS cache directory
	const xdg = process.env.XDG_CACHE_HOME;
	const base =
		xdg ??
		(process.platform === "darwin"
			? join(homedir(), "Library", "Caches")
			: join(homedir(), ".cache"));
	return join(base, "drivebase", "preview-cache");
}

const CACHE_DIR = resolveCacheDir();

function binPath(fileId: string) {
	return join(CACHE_DIR, `${fileId}.bin`);
}

function metaPath(fileId: string) {
	return join(CACHE_DIR, `${fileId}.meta.json`);
}

export async function getPreviewCache(
	fileId: string,
): Promise<CachedPreview | null> {
	try {
		const [data, metaRaw] = await Promise.all([
			readFile(binPath(fileId)),
			readFile(metaPath(fileId), "utf-8"),
		]);
		const meta = JSON.parse(metaRaw) as CacheMeta;
		return { data, mimeType: meta.mimeType, name: meta.name };
	} catch {
		return null;
	}
}

export async function setPreviewCache(
	fileId: string,
	data: Uint8Array,
	meta: CacheMeta,
): Promise<void> {
	if (data.byteLength > MAX_CACHE_BYTES) return;
	try {
		await mkdir(CACHE_DIR, { recursive: true });
		await Promise.all([
			writeFile(binPath(fileId), data),
			writeFile(metaPath(fileId), JSON.stringify(meta)),
		]);
	} catch {
		// Cache write failures are non-fatal
	}
}

export async function hasPreviewCache(fileId: string): Promise<boolean> {
	try {
		await stat(binPath(fileId));
		return true;
	} catch {
		return false;
	}
}
