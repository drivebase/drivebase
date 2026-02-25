import { describe, expect, it } from "bun:test";
import { getContents } from "../../../services/file/query/contents";

describe("file query contents", () => {
	it("exports getContents orchestration", () => {
		expect(typeof getContents).toBe("function");
	});
});
