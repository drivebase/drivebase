/**
 * Normalize a path so that conflict detection is byte-equality safe:
 *   - ensure leading slash
 *   - collapse duplicate slashes
 *   - strip trailing slash (except root)
 *   - unicode NFC normalization
 */
export function normalizePath(p: string): string {
  if (!p) return "/";
  const withLeading = p.startsWith("/") ? p : `/${p}`;
  const collapsed = withLeading.replace(/\/+/g, "/");
  const trimmed =
    collapsed.length > 1 && collapsed.endsWith("/")
      ? collapsed.slice(0, -1)
      : collapsed;
  return trimmed.normalize("NFC");
}

export function joinPath(parent: string, name: string): string {
  if (parent === "/" || parent === "") return normalizePath(`/${name}`);
  return normalizePath(`${parent}/${name}`);
}

export function parentPath(p: string): string {
  const norm = normalizePath(p);
  if (norm === "/") return "/";
  const idx = norm.lastIndexOf("/");
  if (idx <= 0) return "/";
  return norm.slice(0, idx);
}

export function basename(p: string): string {
  const norm = normalizePath(p);
  const idx = norm.lastIndexOf("/");
  return idx === -1 ? norm : norm.slice(idx + 1);
}

const EXT_RE = /(\.[^./\\]+)?$/;
/**
 * Produce the nth rename variant of a name.
 *   "foo.txt", 1  -> "foo (1).txt"
 *   "foo",     3  -> "foo (3)"
 *   "foo (1).txt", 2 -> "foo (1) (2).txt"   (callers pass the original name)
 */
export function renameWithSuffix(name: string, n: number): string {
  const m = name.match(EXT_RE);
  const ext = m?.[1] ?? "";
  const stem = ext ? name.slice(0, -ext.length) : name;
  return `${stem} (${n})${ext}`;
}
