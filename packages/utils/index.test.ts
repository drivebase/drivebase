import { describe, expect, it } from "bun:test";
import { normalizeIds, validatePassword } from "./index";

describe("normalizeIds", () => {
	it("trims, drops empty values, and preserves first-seen order", () => {
		expect(normalizeIds(["  a  ", "", "b", "a", "   ", "c"])).toEqual([
			"a",
			"b",
			"c",
		]);
	});

	it("handles nullish input", () => {
		expect(normalizeIds(undefined)).toEqual([]);
		expect(normalizeIds(null)).toEqual([]);
	});
});

describe("validatePassword", () => {
	it("rejects short passwords", () => {
		expect(validatePassword("abc123")).toEqual({
			valid: false,
			message: "Password must be at least 8 characters long",
		});
	});

	it("rejects passwords without letters", () => {
		expect(validatePassword("12345678")).toEqual({
			valid: false,
			message: "Password must contain at least one letter",
		});
	});

	it("rejects passwords without numbers", () => {
		expect(validatePassword("abcdefgh")).toEqual({
			valid: false,
			message: "Password must contain at least one number",
		});
	});

	it("accepts strong enough passwords", () => {
		expect(validatePassword("abc12345")).toEqual({ valid: true });
	});
});
