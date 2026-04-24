import { useAppRegistryStore } from "../stores/app-registry-store"
import type { AppManifest } from "./app-manifest"

/**
 * Register an app manifest with the kernel. Safe to call multiple times; the
 * second call with the same id is a no-op. Intended to be called at boot from
 * `apps/web/src/driveos/apps.ts`.
 */
export function registerApp(manifest: AppManifest): void {
  useAppRegistryStore.getState().register(manifest)
}
