/**
 * Format bytes into a human-readable string.
 */
export function formatBytes(bytes: number, decimals: number = 2): string {
  if (bytes === 0) return "0 Bytes";

  const k = 1024;
  const dm = Math.max(0, decimals);
  const sizes = ["Bytes", "KB", "MB", "GB", "TB", "PB", "EB", "ZB", "YB"];

  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / k ** i).toFixed(dm))} ${sizes[i]}`;
}

/**
 * Parse a human-readable byte string into bytes.
 */
export function parseBytes(str: string): number {
  const units: Record<string, number> = {
    B: 1,
    KB: 1024,
    MB: 1024 ** 2,
    GB: 1024 ** 3,
    TB: 1024 ** 4,
    PB: 1024 ** 5,
  };

  const match = str.trim().match(/^(\d+(?:\.\d+)?)\s*([A-Za-z]+)$/i);
  if (!match || !match[1] || !match[2]) {
    throw new Error(`Invalid byte string: ${str}`);
  }

  const value = parseFloat(match[1]);
  const unit = match[2].toUpperCase();
  const multiplier = units[unit];

  if (!multiplier) {
    throw new Error(`Unknown byte unit: ${unit}`);
  }

  return Math.round(value * multiplier);
}
