import Tesseract from "tesseract.js";

/**
 * Extract text from an image buffer using Tesseract OCR.
 */
export async function extractFromImage(buffer: Buffer): Promise<string> {
	const {
		data: { text },
	} = await Tesseract.recognize(buffer, "eng");
	return text.trim();
}
