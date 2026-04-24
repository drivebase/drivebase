import { describe, expect, test } from "bun:test";
import { matchUploadChunkRoute } from "./upload-chunk.ts";

function req(method: string, path: string): Request {
  return new Request(`http://localhost${path}`, { method });
}

describe("matchUploadChunkRoute", () => {
  test("matches PUT /api/upload/:sessionId/:index", () => {
    const m = matchUploadChunkRoute(req("PUT", "/api/upload/sess-1/0"));
    expect(m).toEqual({ sessionId: "sess-1", index: 0 });
  });

  test("allows trailing slash", () => {
    expect(
      matchUploadChunkRoute(req("PUT", "/api/upload/sess-1/7/")),
    ).toEqual({ sessionId: "sess-1", index: 7 });
  });

  test("ignores non-PUT methods", () => {
    for (const m of ["GET", "POST", "DELETE", "OPTIONS"]) {
      expect(matchUploadChunkRoute(req(m, "/api/upload/sess-1/0"))).toBeNull();
    }
  });

  test("rejects non-numeric / negative indices", () => {
    expect(
      matchUploadChunkRoute(req("PUT", "/api/upload/sess-1/abc")),
    ).toBeNull();
    // The regex requires digits, so `-1` doesn't match either.
    expect(
      matchUploadChunkRoute(req("PUT", "/api/upload/sess-1/-1")),
    ).toBeNull();
  });

  test("rejects unrelated paths", () => {
    expect(matchUploadChunkRoute(req("PUT", "/api/upload/sess-1"))).toBeNull();
    expect(
      matchUploadChunkRoute(req("PUT", "/api/other/sess-1/0")),
    ).toBeNull();
    expect(
      matchUploadChunkRoute(req("PUT", "/api/upload//0")),
    ).toBeNull();
  });
});
