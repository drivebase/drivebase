/** Default chunk size: 50MB */
export const DEFAULT_CHUNK_SIZE = 50 * 1024 * 1024;

/** Threshold above which chunked upload is used */
export const CHUNK_THRESHOLD = 50 * 1024 * 1024;

/**
 * Slice a blob/buffer into chunks of the given size.
 */
export function sliceIntoChunks(
	data: Blob | ArrayBufferView | ArrayBuffer,
	chunkSize: number,
): Blob[] {
	if (!Number.isInteger(chunkSize) || chunkSize <= 0) {
		throw new RangeError(
			`chunkSize must be a positive integer, got ${chunkSize}`,
		);
	}

	let blob: Blob;
	if (data instanceof Blob) {
		blob = data;
	} else if (data instanceof ArrayBuffer) {
		blob = new Blob([data]);
	} else {
		// ArrayBufferView (e.g. Uint8Array, Buffer)
		blob = new Blob([
			new Uint8Array(
				data.buffer as ArrayBuffer,
				data.byteOffset,
				data.byteLength,
			),
		]);
	}

	const chunks: Blob[] = [];
	let offset = 0;

	while (offset < blob.size) {
		chunks.push(blob.slice(offset, offset + chunkSize));
		offset += chunkSize;
	}

	return chunks;
}
