import { describe, expect, it, mock } from "bun:test";

// Mock heavy dependencies so tests run fast without actual binaries
mock.module("tesseract.js", () => ({
	default: {
		recognize: mock().mockResolvedValue({
			data: { text: "OCR extracted text" },
		}),
	},
}));

mock.module("pdf-parse", () => ({
	PDFParse: class {
		constructor(_opts: unknown) {}
		async getText() {
			return {
				text: "This is a sufficiently long PDF text content that exceeds the minimum character threshold per page for testing purposes.",
				total: 2,
			};
		}
		async destroy() {}
	},
}));

mock.module("mammoth", () => ({
	default: {
		extractRawText: mock().mockResolvedValue({ value: "DOCX content" }),
	},
}));

mock.module("xlsx", () => ({
	read: mock().mockReturnValue({
		SheetNames: ["Sheet1"],
		Sheets: { Sheet1: {} },
	}),
	utils: {
		sheet_to_csv: mock().mockReturnValue("col1,col2\nval1,val2"),
	},
}));

mock.module("jszip", () => ({
	default: {
		loadAsync: mock().mockResolvedValue({
			files: {
				"ppt/slides/slide1.xml": {
					async: mock().mockResolvedValue(
						"<a:t>Slide text</a:t><a:t>More text</a:t>",
					),
				},
			},
		}),
	},
}));

import {
	getExtractor,
	isExtractionSupported,
	isWithinSizeLimit,
} from "../../utils/extraction/index";
import { extractFromText } from "../../utils/extraction/text";

describe("extractFromText", () => {
	it("extracts UTF-8 text from buffer", () => {
		const text = "Hello world\nLine two";
		const result = extractFromText(Buffer.from(text));
		expect(result).toBe(text);
	});

	it("trims whitespace", () => {
		const result = extractFromText(Buffer.from("  hello  \n  "));
		expect(result).toBe("hello");
	});

	it("returns empty string for empty buffer", () => {
		const result = extractFromText(Buffer.alloc(0));
		expect(result).toBe("");
	});
});

describe("getExtractor", () => {
	it("returns extractor for PDF", () => {
		expect(getExtractor("application/pdf")).not.toBeNull();
	});

	it("returns extractor for JPEG images", () => {
		expect(getExtractor("image/jpeg")).not.toBeNull();
	});

	it("returns extractor for PNG images", () => {
		expect(getExtractor("image/png")).not.toBeNull();
	});

	it("returns extractor for plain text", () => {
		expect(getExtractor("text/plain")).not.toBeNull();
	});

	it("returns extractor for markdown", () => {
		expect(getExtractor("text/markdown")).not.toBeNull();
	});

	it("returns extractor for CSV", () => {
		expect(getExtractor("text/csv")).not.toBeNull();
	});

	it("returns extractor for JSON", () => {
		expect(getExtractor("application/json")).not.toBeNull();
	});

	it("returns extractor for DOCX", () => {
		expect(
			getExtractor(
				"application/vnd.openxmlformats-officedocument.wordprocessingml.document",
			),
		).not.toBeNull();
	});

	it("returns extractor for XLSX", () => {
		expect(
			getExtractor(
				"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
			),
		).not.toBeNull();
	});

	it("returns extractor for PPTX", () => {
		expect(
			getExtractor(
				"application/vnd.openxmlformats-officedocument.presentationml.presentation",
			),
		).not.toBeNull();
	});

	it("returns null for unsupported types", () => {
		expect(getExtractor("application/zip")).toBeNull();
		expect(getExtractor("video/mp4")).toBeNull();
		expect(getExtractor("audio/mpeg")).toBeNull();
	});

	it("text extractor returns correct method", async () => {
		const extractor = getExtractor("text/plain");
		const result = await extractor!(Buffer.from("hello"), "text/plain");
		expect(result.method).toBe("direct");
		expect(result.text).toBe("hello");
	});

	it("PDF extractor returns correct method and pageCount", async () => {
		const extractor = getExtractor("application/pdf");
		const result = await extractor!(Buffer.from("fake"), "application/pdf");
		expect(result.method).toBe("pdf_text");
		expect(result.pageCount).toBe(2);
	});

	it("image extractor returns OCR method", async () => {
		const extractor = getExtractor("image/jpeg");
		const result = await extractor!(Buffer.from("fake"), "image/jpeg");
		expect(result.method).toBe("ocr");
		expect(result.text).toBe("OCR extracted text");
	});

	it("office extractor returns correct method", async () => {
		const extractor = getExtractor(
			"application/vnd.openxmlformats-officedocument.wordprocessingml.document",
		);
		const result = await extractor!(
			Buffer.from("fake"),
			"application/vnd.openxmlformats-officedocument.wordprocessingml.document",
		);
		expect(result.method).toBe("office");
		expect(result.text).toBe("DOCX content");
	});
});

describe("isExtractionSupported", () => {
	it("returns true for supported types", () => {
		expect(isExtractionSupported("application/pdf")).toBe(true);
		expect(isExtractionSupported("image/png")).toBe(true);
		expect(isExtractionSupported("text/plain")).toBe(true);
	});

	it("returns false for unsupported types", () => {
		expect(isExtractionSupported("video/mp4")).toBe(false);
		expect(isExtractionSupported("application/zip")).toBe(false);
	});
});

describe("isWithinSizeLimit", () => {
	it("returns true for files under 100MB", () => {
		expect(isWithinSizeLimit(1024)).toBe(true);
		expect(isWithinSizeLimit(50 * 1024 * 1024)).toBe(true);
	});

	it("returns true for exactly 100MB", () => {
		expect(isWithinSizeLimit(100 * 1024 * 1024)).toBe(true);
	});

	it("returns false for files over 100MB", () => {
		expect(isWithinSizeLimit(100 * 1024 * 1024 + 1)).toBe(false);
	});
});
