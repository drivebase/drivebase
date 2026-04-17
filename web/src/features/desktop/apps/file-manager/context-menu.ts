import { ExternalLink, FolderOpen, Info, PlugZap } from "lucide-react";
import {
	registerAppContextMenuResolver,
	type AppContextMenuItem,
	type AppContextTargetData,
} from "@/features/desktop/app-context-menu-registry";
import { Desktop } from "@/features/desktop/hooks/use-desktop";
import { eventBus } from "@/lib/event-bus";
import { useWindowManagerStore } from "@/store/window-manager";

function getCapabilities(target: AppContextTargetData): string[] {
	const capabilities = target.metadata?.capabilities;
	return Array.isArray(capabilities)
		? capabilities.filter((value): value is string => typeof value === "string")
		: [];
}

function getSourceId(target: AppContextTargetData): string | undefined {
	const sourceId = target.metadata?.sourceId;
	return typeof sourceId === "string" ? sourceId : undefined;
}

function getLocationId(target: AppContextTargetData): string {
	const locationId = target.metadata?.locationId;
	return typeof locationId === "string" ? locationId : target.entityId;
}

function openInWindow(target: AppContextTargetData) {
	const currentWindow = useWindowManagerStore.getState().windows[target.windowId];
	if (!currentWindow) return;

	useWindowManagerStore.getState().updateAppState(target.windowId, {
		locationId: getLocationId(target),
		sourceId: getSourceId(target),
	});
}

function openInNewWindow(target: AppContextTargetData) {
	Desktop.openApp("file-manager", {
		appState: {
			locationId: getLocationId(target),
			sourceId: getSourceId(target),
		},
		reuseExisting: false,
	});
}

function createActionItems(target: AppContextTargetData): AppContextMenuItem[] {
	const items: AppContextMenuItem[] = [];
	const capabilities = getCapabilities(target);

	if (capabilities.includes("open")) {
		items.push({
			type: "item",
			id: "open",
			label: "Open",
			icon: FolderOpen,
			onSelect: () => openInWindow(target),
		});
	}

	if (capabilities.includes("open-new-window")) {
		items.push({
			type: "item",
			id: "open-new-window",
			label: "Open in New Window",
			icon: ExternalLink,
			onSelect: () => openInNewWindow(target),
		});
	}

	if (capabilities.includes("get-info")) {
		if (items.length > 0) {
			items.push({ type: "separator", id: "before-info" });
		}
		items.push({
			type: "item",
			id: "get-info",
			label: "Get Info",
			icon: Info,
			onSelect: () => {},
		});
	}

	if (capabilities.includes("disconnect")) {
		items.push({ type: "separator", id: "before-disconnect" });
		items.push({
			type: "item",
			id: "disconnect",
			label: "Disconnect",
			icon: PlugZap,
			destructive: true,
			onSelect: () => {
				const sourceId = getSourceId(target);
				if (sourceId) {
					eventBus.emit("provider:disconnected", { providerId: sourceId });
				}
			},
		});
	}

	return items;
}

registerAppContextMenuResolver("file-manager", (target) => {
	if (target.entityType !== "sidebar-item") return [];
	return createActionItems(target);
});
