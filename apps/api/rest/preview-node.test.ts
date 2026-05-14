import { describe, expect, test } from "bun:test";
import { matchPreviewRoute } from "./preview-node.ts";

function req(method: string, path: string): Request {
  return new Request(`http://localhost${path}`, { method });
}

describe("matchPreviewRoute", () => {
  test("matches GET /api/preview/:nodeId", () => {
    expect(matchPreviewRoute(req("GET", "/api/preview/node-abc-123"))).toEqual({
      nodeId: "node-abc-123",
    });
  });

  test("allows trailing slash", () => {
    expect(matchPreviewRoute(req("GET", "/api/preview/node-1/"))).toEqual({
      nodeId: "node-1",
    });
  });

  test("rejects non-GET methods", () => {
    for (const m of ["POST", "PUT", "DELETE", "OPTIONS"]) {
      expect(matchPreviewRoute(req(m, "/api/preview/node-1"))).toBeNull();
    }
  });

  test("rejects unrelated paths", () => {
    expect(matchPreviewRoute(req("GET", "/api/download/node-1"))).toBeNull();
    expect(matchPreviewRoute(req("GET", "/api/preview/"))).toBeNull();
    expect(matchPreviewRoute(req("GET", "/api/preview"))).toBeNull();
  });
});
