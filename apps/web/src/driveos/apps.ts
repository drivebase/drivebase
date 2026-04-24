import type { AppManifest } from "@drivebase/kernel"
import { providersManifest } from "@drivebase/app-providers"
import { filesManifest } from "@drivebase/app-files"

/**
 * Static registry of every DriveOS app. New apps = drop a manifest here.
 * Milestones 6–7 add transfers / settings manifests.
 */
export const apps: AppManifest[] = [filesManifest, providersManifest]
