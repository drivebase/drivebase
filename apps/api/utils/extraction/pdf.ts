import { spawnSync } from "node:child_process";
import {
	mkdtempSync,
	readdirSync,
	readFileSync,
	rmSync,
	writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { PDFParse } from "pdf-parse";
import { extractFromImage } from "./image";

const MIN_CHARS_PER_PAGE = 50;

/**
 * Extract text from a PDF buffer.
 * Falls back to OCR if the PDF has very little extractable text.
 */
export async function extractFromPdf(buffer: Buffer): Promise<{
	text: string;
	method: "pdf_text" | "pdf_ocr";
	pageCount: number;
}> {
	const parser = new PDFParse({ data: new Uint8Array(buffer) });
	const textResult = await parser.getText();
	const pageCount = textResult.total;
	const text = textResult.text.trim();

	const avgCharsPerPage = pageCount > 0 ? text.length / pageCount : 0;

	await parser.destroy();

	if (avgCharsPerPage >= MIN_CHARS_PER_PAGE) {
		return { text, method: "pdf_text", pageCount };
	}

	// Fallback: convert PDF pages to images and OCR
	const ocrText = await extractPdfViaOcr(buffer);
	return { text: ocrText || text, method: "pdf_ocr", pageCount };
}

async function extractPdfViaOcr(buffer: Buffer): Promise<string> {
	const tmpDir = mkdtempSync(join(tmpdir(), "pdf-ocr-"));
	try {
		const pdfPath = join(tmpDir, "input.pdf");
		const outPrefix = join(tmpDir, "page");
		writeFileSync(pdfPath, buffer);

		const result = spawnSync(
			"pdftoppm",
			["-r", "150", "-png", pdfPath, outPrefix],
			{
				timeout: 60_000,
			},
		);
		if (result.status !== 0) return "";

		const pngFiles = readdirSync(tmpDir)
			.filter((f) => f.endsWith(".png"))
			.sort()
			.map((f) => join(tmpDir, f));

		const pages: string[] = [];
		for (const pngPath of pngFiles) {
			const imageBuffer = readFileSync(pngPath);
			const pageText = await extractFromImage(imageBuffer);
			if (pageText) pages.push(pageText);
		}

		return pages.join("\n\n");
	} catch {
		return "";
	} finally {
		rmSync(tmpDir, { recursive: true, force: true });
	}
}
