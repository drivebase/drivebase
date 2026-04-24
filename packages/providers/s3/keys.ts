/**
 * S3 is flat; we synthesize a folder hierarchy from `/`-delimited keys.
 *
 * Convention:
 *   - remoteId for a file   = its object key, e.g. "photos/cat.jpg"
 *   - remoteId for a folder = its prefix with a trailing slash, e.g. "photos/"
 *   - remoteId for the root = "" (empty string) — callers also accept null
 *
 * `createFolder` writes a zero-byte object with key ending in `/`; most
 * S3-compatible stores render this as an empty folder in their UI and
 * makes the folder discoverable via ListObjectsV2.
 */

export type S3Ref =
  | { kind: "root" }
  | { kind: "folder"; prefix: string }
  | { kind: "file"; key: string };

export function parseRemoteId(remoteId: string | null): S3Ref {
  if (remoteId === null || remoteId === "") return { kind: "root" };
  if (remoteId.endsWith("/")) return { kind: "folder", prefix: remoteId };
  return { kind: "file", key: remoteId };
}

/** Normalize a parentRemoteId ("" | null | "foo/") into a prefix usable with Delimiter=/. */
export function toPrefix(parentRemoteId: string | null | undefined): string {
  if (!parentRemoteId) return "";
  if (parentRemoteId.endsWith("/")) return parentRemoteId;
  // An unterminated string must be a file key — treat as no prefix.
  return `${parentRemoteId}/`;
}

export function nameFromKey(key: string): string {
  const trimmed = key.endsWith("/") ? key.slice(0, -1) : key;
  const idx = trimmed.lastIndexOf("/");
  return idx === -1 ? trimmed : trimmed.slice(idx + 1);
}
