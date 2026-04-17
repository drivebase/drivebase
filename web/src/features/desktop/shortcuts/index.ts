import { Cloud, HardDrive } from "lucide-react";
import { registerShortcut } from "./shortcut-registry";
import { Desktop } from "@/features/desktop/hooks/use-desktop";

// Dummy provider shortcuts — replace with real provider data once API is wired
registerShortcut({
	id: "google-drive",
	label: "Google Drive",
	icon: Cloud,
	subtitle: "12.4 GB used",
	onOpen: (opts) =>
		Desktop.openApp("file-manager", {
			appState: { sourceId: "google-drive" },
			launchSourceRect: opts?.launchSourceRect,
			reuseExisting: false,
		}),
});

registerShortcut({
	id: "local-storage",
	label: "Local Storage",
	icon: HardDrive,
	subtitle: "256 GB free",
	onOpen: (opts) =>
		Desktop.openApp("file-manager", {
			appState: { sourceId: "local" },
			launchSourceRect: opts?.launchSourceRect,
			reuseExisting: false,
		}),
});
