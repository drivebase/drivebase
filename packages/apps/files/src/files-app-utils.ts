export function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`
  if (n < 1024 ** 2) return `${(n / 1024).toFixed(1)} KB`
  if (n < 1024 ** 3) return `${(n / 1024 ** 2).toFixed(1)} MB`
  return `${(n / 1024 ** 3).toFixed(2)} GB`
}

export function nextFolderName(names: Iterable<string>): string {
  const taken = new Set(names)
  if (!taken.has("New Folder")) return "New Folder"
  let suffix = 1
  while (taken.has(`New Folder (${suffix})`)) {
    suffix += 1
  }
  return `New Folder (${suffix})`
}
