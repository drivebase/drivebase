import { describe, expect, test } from "bun:test";
import { nameFromKey, parseRemoteId, toPrefix } from "./keys.ts";

describe("s3 key helpers", () => {
  test("parseRemoteId discriminates root/folder/file", () => {
    expect(parseRemoteId(null)).toEqual({ kind: "root" });
    expect(parseRemoteId("")).toEqual({ kind: "root" });
    expect(parseRemoteId("photos/")).toEqual({
      kind: "folder",
      prefix: "photos/",
    });
    expect(parseRemoteId("photos/cat.jpg")).toEqual({
      kind: "file",
      key: "photos/cat.jpg",
    });
  });

  test("toPrefix terminates with slash", () => {
    expect(toPrefix(null)).toBe("");
    expect(toPrefix("")).toBe("");
    expect(toPrefix("foo/")).toBe("foo/");
    expect(toPrefix("foo")).toBe("foo/");
  });

  test("nameFromKey strips parents & trailing slash", () => {
    expect(nameFromKey("photos/cat.jpg")).toBe("cat.jpg");
    expect(nameFromKey("photos/")).toBe("photos");
    expect(nameFromKey("cat.jpg")).toBe("cat.jpg");
  });
});
