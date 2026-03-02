import { describe, expect, it } from "bun:test";
import {
	DrivebaseError,
	NotFoundError,
	ProviderError,
	toJsonSafeError,
	ValidationError,
} from "./errors";

describe("DrivebaseError", () => {
	it("creates error with all properties", () => {
		const error = new DrivebaseError("Test error", "TEST_CODE", 400, {
			field: "value",
		});

		expect(error.message).toBe("Test error");
		expect(error.code).toBe("TEST_CODE");
		expect(error.statusCode).toBe(400);
		expect(error.details).toEqual({ field: "value" });
		expect(error.name).toBe("DrivebaseError");
		expect(error.stack).toBeDefined();
	});

	it("uses default statusCode of 500", () => {
		const error = new DrivebaseError("Test error", "TEST_CODE");

		expect(error.statusCode).toBe(500);
	});

	describe("toJSON()", () => {
		it("serializes all fields to JSON", () => {
			const error = new DrivebaseError("Test error", "TEST_CODE", 400, {
				field: "value",
			});

			const json = error.toJSON();

			expect(json.name).toBe("DrivebaseError");
			expect(json.message).toBe("Test error");
			expect(json.code).toBe("TEST_CODE");
			expect(json.statusCode).toBe(400);
			expect(json.details).toEqual({ field: "value" });
			expect(json.stack).toBeDefined();
		});

		it("handles undefined details", () => {
			const error = new DrivebaseError("Test error", "TEST_CODE");

			const json = error.toJSON();

			expect(json.details).toBeUndefined();
		});

		it("is JSON.stringify compatible", () => {
			const error = new DrivebaseError("Test error", "TEST_CODE", 400, {
				nested: { value: 123 },
			});

			const jsonString = JSON.stringify(error);
			const parsed = JSON.parse(jsonString);

			expect(parsed.message).toBe("Test error");
			expect(parsed.code).toBe("TEST_CODE");
			expect(parsed.statusCode).toBe(400);
			expect(parsed.details.nested.value).toBe(123);
		});
	});
});

describe("ProviderError", () => {
	it("creates error with providerType", () => {
		const error = new ProviderError("s3", "Upload failed", {
			bucket: "my-bucket",
		});

		expect(error.message).toBe("Upload failed");
		expect(error.providerType).toBe("s3");
		expect(error.code).toBe("PROVIDER_ERROR");
		expect(error.statusCode).toBe(500);
		expect(error.details).toEqual({ bucket: "my-bucket" });
		expect(error.name).toBe("ProviderError");
	});

	describe("toJSON()", () => {
		it("includes providerType in serialized output", () => {
			const error = new ProviderError("google_drive", "Download failed", {
				remoteId: "file123",
			});

			const json = error.toJSON();

			expect(json.name).toBe("ProviderError");
			expect(json.message).toBe("Download failed");
			expect(json.code).toBe("PROVIDER_ERROR");
			expect(json.statusCode).toBe(500);
			expect(json.providerType).toBe("google_drive");
			expect(json.details).toEqual({ remoteId: "file123" });
			expect(json.stack).toBeDefined();
		});

		it("is JSON.stringify compatible with providerType", () => {
			const error = new ProviderError("webdav", "Connection failed");

			const jsonString = JSON.stringify(error);
			const parsed = JSON.parse(jsonString);

			expect(parsed.providerType).toBe("webdav");
			expect(parsed.message).toBe("Connection failed");
		});
	});
});

describe("toJsonSafeError()", () => {
	describe("with DrivebaseError", () => {
		it("returns toJSON() output for DrivebaseError", () => {
			const error = new DrivebaseError("Test error", "TEST_CODE", 400, {
				key: "value",
			});

			const result = toJsonSafeError(error);

			expect(result.name).toBe("DrivebaseError");
			expect(result.message).toBe("Test error");
			expect(result.code).toBe("TEST_CODE");
			expect(result.statusCode).toBe(400);
		});

		it("returns toJSON() output for ProviderError", () => {
			const error = new ProviderError("ftp", "List failed", { path: "/" });

			const result = toJsonSafeError(error);

			expect(result.name).toBe("ProviderError");
			expect(result.message).toBe("List failed");
			expect((result as Record<string, unknown>).providerType).toBe("ftp");
		});

		it("returns toJSON() output for ValidationError", () => {
			const error = new ValidationError("Invalid input");

			const result = toJsonSafeError(error);

			expect(result.name).toBe("ValidationError");
			expect(result.message).toBe("Invalid input");
			expect(result.code).toBe("VALIDATION_ERROR");
			expect(result.statusCode).toBe(400);
		});

		it("returns toJSON() output for NotFoundError", () => {
			const error = new NotFoundError("File");

			const result = toJsonSafeError(error);

			expect(result.name).toBe("NotFoundError");
			expect(result.message).toBe("File not found");
			expect(result.code).toBe("NOT_FOUND");
			expect(result.statusCode).toBe(404);
		});
	});

	describe("with standard Error", () => {
		it("extracts standard Error fields", () => {
			const error = new Error("Something went wrong");

			const result = toJsonSafeError(error);

			expect(result.name).toBe("Error");
			expect(result.message).toBe("Something went wrong");
			expect(result.stack).toBeDefined();
		});

		it("extracts code property if present", () => {
			const error = new Error("File not found") as Error & { code: string };
			error.code = "ENOENT";

			const result = toJsonSafeError(error);

			expect(result.message).toBe("File not found");
			expect(result.code).toBe("ENOENT");
		});

		it("extracts status property if present", () => {
			const error = new Error("Unauthorized") as Error & { status: number };
			error.status = 401;

			const result = toJsonSafeError(error);

			expect(result.message).toBe("Unauthorized");
			expect(result.status).toBe(401);
		});

		it("extracts statusCode property if present", () => {
			const error = new Error("Bad request") as Error & { statusCode: number };
			error.statusCode = 400;

			const result = toJsonSafeError(error);

			expect(result.message).toBe("Bad request");
			expect(result.statusCode).toBe(400);
		});

		it("handles TypeError", () => {
			const error = new TypeError("Cannot read property of undefined");

			const result = toJsonSafeError(error);

			expect(result.name).toBe("TypeError");
			expect(result.message).toBe("Cannot read property of undefined");
		});

		it("handles RangeError", () => {
			const error = new RangeError("Invalid array length");

			const result = toJsonSafeError(error);

			expect(result.name).toBe("RangeError");
			expect(result.message).toBe("Invalid array length");
		});
	});

	describe("with non-Error values", () => {
		it("handles string", () => {
			const result = toJsonSafeError("Something went wrong");

			expect(result.message).toBe("Something went wrong");
			expect(result.name).toBeUndefined();
			expect(result.stack).toBeUndefined();
		});

		it("handles number", () => {
			const result = toJsonSafeError(404);

			expect(result.message).toBe("404");
		});

		it("handles null", () => {
			const result = toJsonSafeError(null);

			expect(result.message).toBe("null");
		});

		it("handles undefined", () => {
			const result = toJsonSafeError(undefined);

			expect(result.message).toBe("undefined");
		});

		it("handles object without Error properties", () => {
			const result = toJsonSafeError({ foo: "bar" });

			expect(result.message).toBe("[object Object]");
		});

		it("handles object with toString()", () => {
			const obj = {
				toString() {
					return "Custom error message";
				},
			};

			const result = toJsonSafeError(obj);

			expect(result.message).toBe("Custom error message");
		});
	});

	describe("JSON safety", () => {
		it("produces JSON-serializable output for Error", () => {
			const error = new Error("Test");

			const result = toJsonSafeError(error);
			const jsonString = JSON.stringify(result);

			expect(() => JSON.parse(jsonString)).not.toThrow();
		});

		it("produces JSON-serializable output for ProviderError with nested details", () => {
			const error = new ProviderError("s3", "Failed", {
				op: "upload",
				error: {
					code: "AccessDenied",
					message: "Access Denied",
				},
			});

			const result = toJsonSafeError(error);
			const jsonString = JSON.stringify(result);

			expect(() => JSON.parse(jsonString)).not.toThrow();
			const parsed = JSON.parse(jsonString);
			expect(parsed.details.error.code).toBe("AccessDenied");
		});
	});
});
