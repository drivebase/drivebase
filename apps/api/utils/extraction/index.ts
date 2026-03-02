import { extractFromImage } from "./image";
import { extractFromOffice } from "./office";
import { extractFromPdf } from "./pdf";
import { extractFromText } from "./text";

export type ExtractionResult = {
	text: string;
	method: string;
	pageCount?: number;
};

type ExtractorFn = (
	buffer: Buffer,
	mimeType: string,
) => Promise<ExtractionResult>;

const IMAGE_TYPES = new Set([
	"image/jpeg",
	"image/png",
	"image/tiff",
	"image/bmp",
	"image/webp",
]);

const TEXT_TYPES = new Set([
	"text/plain",
	"text/markdown",
	"text/csv",
	"text/html",
	"text/xml",
	"application/json",
	"application/xml",
]);

const OFFICE_TYPES = new Set([
	"application/vnd.openxmlformats-officedocument.wordprocessingml.document",
	"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
	"application/vnd.openxmlformats-officedocument.presentationml.presentation",
	"application/vnd.ms-excel",
]);

/** Max file size for extraction (100MB) */
const MAX_EXTRACTION_SIZE = 100 * 1024 * 1024;

/**
 * Get an extraction function for the given MIME type, or null if unsupported.
 */
export function getExtractor(mimeType: string): ExtractorFn | null {
	if (mimeType === "application/pdf") {
		return async (buffer) => {
			const result = await extractFromPdf(buffer);
			return {
				text: result.text,
				method: result.method,
				pageCount: result.pageCount,
			};
		};
	}

	if (IMAGE_TYPES.has(mimeType)) {
		return async (buffer) => {
			const text = await extractFromImage(buffer);
			return { text, method: "ocr" };
		};
	}

	if (OFFICE_TYPES.has(mimeType)) {
		return async (buffer, mime) => {
			const text = await extractFromOffice(buffer, mime);
			return { text, method: "office" };
		};
	}

	if (TEXT_TYPES.has(mimeType)) {
		return async (buffer) => {
			const text = extractFromText(buffer);
			return { text, method: "direct" };
		};
	}

	return null;
}

/**
 * Check if a file is eligible for content extraction.
 */
export function isExtractionSupported(mimeType: string): boolean {
	return getExtractor(mimeType) !== null;
}

/**
 * Check if a file size is within extraction limits.
 */
export function isWithinSizeLimit(size: number): boolean {
	return size <= MAX_EXTRACTION_SIZE;
}

export { extractFromImage } from "./image";
export { extractFromOffice } from "./office";
export { extractFromPdf } from "./pdf";
export { extractFromText } from "./text";
