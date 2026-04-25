import type { AppManifest } from "@drivebase/kernel"
import { providersManifest } from "@drivebase/app-providers"
import { filesManifest } from "@drivebase/app-files"
import { settingsManifest } from "@drivebase/app-settings"

export const apps: AppManifest[] = [filesManifest, providersManifest, settingsManifest]
