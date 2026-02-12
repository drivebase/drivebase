const MIME_LABEL_MAP: Record<string, string> = {
	jpeg: "JPEG",
	jpg: "JPG",
	png: "PNG",
	gif: "GIF",
	webp: "WEBP",
	svg: "SVG",
	pdf: "PDF",
	csv: "CSV",
	json: "JSON",
	xml: "XML",
	zip: "ZIP",
	gz: "GZ",
	tar: "TAR",
	mp4: "MP4",
	mp3: "MP3",
	wav: "WAV",
	txt: "TXT",
};

export type FileKind =
	| "image"
	| "video"
	| "audio"
	| "pdf"
	| "archive"
	| "code"
	| "text"
	| "document"
	| "other";

export function formatSize(bytes: number): string {
	if (bytes === 0) return "0 B";
	const k = 1024;
	const sizes = ["B", "KB", "MB", "GB", "TB"];
	const i = Math.floor(Math.log(bytes) / Math.log(k));
	return `${parseFloat((bytes / k ** i).toFixed(1))} ${sizes[i]}`;
}

export function formatFileTypeLabel(mimeType?: string | null): string {
	if (!mimeType) return "Unknown";

	const [majorRaw, subtypeRaw] = mimeType.split("/");
	const major = (majorRaw || "").toLowerCase();
	const subtype = (subtypeRaw || "").split(";")[0]?.trim().toLowerCase();

	if (!subtype) return "Unknown";

	const normalized = subtype.replace(/^vnd\./, "").split("+")[0] || subtype;

	if (MIME_LABEL_MAP[normalized]) {
		return MIME_LABEL_MAP[normalized];
	}

	if (major === "text" && normalized === "plain") {
		return "TXT";
	}

	return normalized
		.replace(/[._-]+/g, " ")
		.replace(/\b\w/g, (char) => char.toUpperCase());
}

export function formatProviderTypeLabel(providerType?: string | null): string {
	if (!providerType) return "Unknown";

	return providerType
		.toLowerCase()
		.replace(/[._-]+/g, " ")
		.replace(/\b\w/g, (char) => char.toUpperCase());
}

export function getFileKind(mimeType?: string | null): FileKind {
	if (!mimeType) return "other";

	const [majorRaw, subtypeRaw] = mimeType.split("/");
	const major = (majorRaw || "").toLowerCase();
	const subtype = (subtypeRaw || "").split(";")[0]?.trim().toLowerCase() || "";

	if (major === "image") return "image";
	if (major === "video") return "video";
	if (major === "audio") return "audio";

	if (subtype.includes("pdf")) return "pdf";
	if (
		["zip", "x-zip-compressed", "x-gzip", "gzip", "x-tar", "rar", "7z"].some(
			(v) => subtype.includes(v),
		)
	) {
		return "archive";
	}
	if (
		major === "text" ||
		subtype.includes("json") ||
		subtype.includes("xml") ||
		subtype.includes("javascript") ||
		subtype.includes("typescript")
	) {
		return "code";
	}
	if (subtype.includes("plain")) return "text";
	if (major === "application") return "document";

	return "other";
}
