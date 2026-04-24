import { describe, expect, test } from "bun:test";
import {
  normalizePath,
  joinPath,
  parentPath,
  basename,
  renameWithSuffix,
} from "./path.ts";

describe("path", () => {
  test("normalize collapses slashes & adds leading slash", () => {
    expect(normalizePath("foo//bar/")).toBe("/foo/bar");
    expect(normalizePath("/")).toBe("/");
    expect(normalizePath("")).toBe("/");
  });

  test("join handles root parent", () => {
    expect(joinPath("/", "a.txt")).toBe("/a.txt");
    expect(joinPath("/foo", "a.txt")).toBe("/foo/a.txt");
  });

  test("parent & basename", () => {
    expect(parentPath("/a/b/c.txt")).toBe("/a/b");
    expect(basename("/a/b/c.txt")).toBe("c.txt");
    expect(parentPath("/")).toBe("/");
  });

  test("renameWithSuffix preserves extension", () => {
    expect(renameWithSuffix("foo.txt", 1)).toBe("foo (1).txt");
    expect(renameWithSuffix("foo.tar.gz", 2)).toBe("foo.tar (2).gz");
    expect(renameWithSuffix("foo", 3)).toBe("foo (3)");
  });
});
