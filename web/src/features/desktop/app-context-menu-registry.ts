import type { ComponentType } from "react";
export interface AppContextTargetData {
	appId: string;
	windowId: string;
	entityType: string;
	entityId: string;
	label: string;
	metadata?: Record<string, unknown>;
}

export type AppContextMenuItem =
	| {
			type: "item";
			id: string;
			label: string;
			icon?: ComponentType<{ size?: number; className?: string }>;
			shortcut?: string;
			destructive?: boolean;
			onSelect: () => void;
	  }
	| { type: "separator"; id: string };

type AppContextMenuResolver = (
	target: AppContextTargetData,
) => AppContextMenuItem[];

const APP_CONTEXT_MENU_RESOLVERS = new Map<string, AppContextMenuResolver>();

export function registerAppContextMenuResolver(
	appId: string,
	resolver: AppContextMenuResolver,
) {
	APP_CONTEXT_MENU_RESOLVERS.set(appId, resolver);
}

export function getAppContextMenuItems(
	target: AppContextTargetData,
): AppContextMenuItem[] {
	return APP_CONTEXT_MENU_RESOLVERS.get(target.appId)?.(target) ?? [];
}
