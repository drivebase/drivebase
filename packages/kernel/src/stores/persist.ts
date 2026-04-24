import { persist, type PersistOptions } from "zustand/middleware"

/** Persistence key prefix for every kernel / app zustand store. */
export const PERSIST_PREFIX = "drivebase:"

/**
 * Build a namespaced persist config. Keeps all DriveOS keys under a single
 * recognizable prefix in localStorage so it's easy to clear for debugging.
 */
export function kernelPersist<T>(
  name: string,
  opts: Omit<PersistOptions<T, T>, "name"> = {},
): PersistOptions<T, T> {
  return { name: `${PERSIST_PREFIX}${name}`, ...opts }
}

export { persist }
