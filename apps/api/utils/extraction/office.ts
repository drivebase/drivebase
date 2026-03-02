import mammoth from "mammoth";
import * as XLSX from "xlsx";

/**
 * Extract text from Office documents.
 */
export async function extractFromOffice(
	buffer: Buffer,
	mimeType: string,
): Promise<string> {
	if (
		mimeType ===
		"application/vnd.openxmlformats-officedocument.wordprocessingml.document"
	) {
		return extractDocx(buffer);
	}

	if (
		mimeType ===
			"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" ||
		mimeType === "application/vnd.ms-excel"
	) {
		return extractXlsx(buffer);
	}

	if (
		mimeType ===
		"application/vnd.openxmlformats-officedocument.presentationml.presentation"
	) {
		return extractPptx(buffer);
	}

	return "";
}

async function extractDocx(buffer: Buffer): Promise<string> {
	const result = await mammoth.extractRawText({ buffer });
	return result.value.trim();
}

function extractXlsx(buffer: Buffer): string {
	const workbook = XLSX.read(buffer, { type: "buffer" });
	const texts: string[] = [];

	for (const sheetName of workbook.SheetNames) {
		const sheet = workbook.Sheets[sheetName];
		if (sheet) {
			const csv = XLSX.utils.sheet_to_csv(sheet);
			texts.push(csv);
		}
	}

	return texts.join("\n\n").trim();
}

async function extractPptx(buffer: Buffer): Promise<string> {
	// PPTX files are ZIP archives with XML content
	const JSZip = (await import("jszip")).default;
	const zip = await JSZip.loadAsync(buffer);
	const texts: string[] = [];

	// Slide content is in ppt/slides/slide*.xml
	const slideFiles = Object.keys(zip.files)
		.filter((name) => /^ppt\/slides\/slide\d+\.xml$/.test(name))
		.sort();

	for (const slideFile of slideFiles) {
		const file = zip.files[slideFile];
		if (!file) continue;
		const content = await file.async("text");
		// Extract text from XML tags (a:t elements contain text)
		const textMatches = content.match(/<a:t[^>]*>([^<]*)<\/a:t>/g);
		if (textMatches) {
			const slideText = textMatches
				.map((match) => match.replace(/<[^>]+>/g, ""))
				.join(" ");
			texts.push(slideText);
		}
	}

	return texts.join("\n\n").trim();
}
