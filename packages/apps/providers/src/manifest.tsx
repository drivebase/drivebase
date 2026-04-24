import type { AppManifest } from "@drivebase/kernel"
import { ProvidersApp } from "./providers-app"
import Icon from "./icon.png"

export const providersManifest: AppManifest = {
  id: "providers",
  name: "Providers",
  version: "0.0.1",
  icon: { kind: "image", src: Icon },
  singleton: true,
  defaultWindowSize: { w: 460, h: 560 },
  minWindowSize: { w: 360, h: 320 },
  component: ProvidersApp,
  shortcuts: [],
}
