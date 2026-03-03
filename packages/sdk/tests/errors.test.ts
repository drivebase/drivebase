import { describe, expect, it } from "bun:test";
import {
	ApiError,
	AuthenticationError,
	DrivebaseError,
	NetworkError,
	UploadError,
} from "../src/errors.ts";

describe("DrivebaseError", () => {
	it("sets message, code, and statusCode", () => {
		const err = new DrivebaseError("test", "TEST_CODE", 500);
		expect(err.message).toBe("test");
		expect(err.code).toBe("TEST_CODE");
		expect(err.statusCode).toBe(500);
		expect(err.name).toBe("DrivebaseError");
		expect(err).toBeInstanceOf(Error);
	});
});

describe("ApiError", () => {
	it("stores GraphQL errors array", () => {
		const gqlErrors = [
			{ message: "Field not found" },
			{ message: "Invalid type" },
		];
		const err = new ApiError("request failed", gqlErrors, 400);
		expect(err.errors).toHaveLength(2);
		expect(err.errors[0]!.message).toBe("Field not found");
		expect(err.code).toBe("API_ERROR");
		expect(err.statusCode).toBe(400);
		expect(err).toBeInstanceOf(DrivebaseError);
	});
});

describe("AuthenticationError", () => {
	it("uses default message and 401 status", () => {
		const err = new AuthenticationError();
		expect(err.message).toBe("Authentication failed");
		expect(err.code).toBe("AUTHENTICATION_ERROR");
		expect(err.statusCode).toBe(401);
	});

	it("accepts custom message", () => {
		const err = new AuthenticationError("Invalid API key");
		expect(err.message).toBe("Invalid API key");
	});
});

describe("NetworkError", () => {
	it("wraps a cause error", () => {
		const cause = new TypeError("fetch failed");
		const err = new NetworkError("Connection refused", cause);
		expect(err.message).toBe("Connection refused");
		expect(err.cause).toBe(cause);
		expect(err.code).toBe("NETWORK_ERROR");
	});
});

describe("UploadError", () => {
	it("stores optional sessionId", () => {
		const err = new UploadError("chunk failed", "session-123");
		expect(err.message).toBe("chunk failed");
		expect(err.sessionId).toBe("session-123");
		expect(err.code).toBe("UPLOAD_ERROR");
	});
});
