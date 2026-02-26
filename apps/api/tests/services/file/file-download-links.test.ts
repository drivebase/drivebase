import { describe, expect, it } from "bun:test";
import {
	consumeFileDownloadLink,
	createFileDownloadLink,
	getFileDownloadLinkByToken,
	listActiveFileDownloadLinks,
	revokeFileDownloadLink,
} from "../../../service/file/download-link";

describe("file download link service exports", () => {
	it("exports file download link operations", () => {
		expect(typeof createFileDownloadLink).toBe("function");
		expect(typeof listActiveFileDownloadLinks).toBe("function");
		expect(typeof revokeFileDownloadLink).toBe("function");
		expect(typeof getFileDownloadLinkByToken).toBe("function");
		expect(typeof consumeFileDownloadLink).toBe("function");
	});
});
