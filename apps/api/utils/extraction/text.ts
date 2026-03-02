/**
 * Extract text from plain text file formats.
 */
export function extractFromText(buffer: Buffer): string {
	return buffer.toString("utf-8").trim();
}
