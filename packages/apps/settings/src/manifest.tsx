import type { AppManifest } from "@drivebase/kernel"
import { SettingsApp } from "./settings-app"
import Icon from "./icon.png"

export const settingsManifest: AppManifest = {
  id: "settings",
  name: "Settings",
  version: "0.0.1",
  icon: { kind: "image", src: Icon },
  singleton: true,
  defaultWindowSize: { w: 680, h: 500 },
  minWindowSize: { w: 520, h: 380 },
  component: SettingsApp,
  shortcuts: [],
}
