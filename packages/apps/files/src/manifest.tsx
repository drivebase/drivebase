import type { AppManifest } from "@drivebase/kernel"
import { FilesApp } from "./files-app"
import Icon from "./icon.png"

export const filesManifest: AppManifest = {
  id: "files",
  name: "Files",
  version: "0.0.1",
  icon: { kind: "image", src: Icon },
  // Files is explicitly multi-window: the shell uses window ids like
  // `files:<nanoid>` so each window keeps its own nav state.
  singleton: false,
  defaultWindowSize: { w: 880, h: 560 },
  minWindowSize: { w: 520, h: 360 },
  component: FilesApp,
  shortcuts: [],
}
