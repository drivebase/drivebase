import type { ComponentType } from "react";

export interface AppDefinition {
	id: string;
	label: string;
	icon: ComponentType<{ size?: number; className?: string }>;
	component: ComponentType<{ windowId: string; appState?: Record<string, unknown> }>;
	defaultSize: { width: number; height: number };
	minSize: { width: number; height: number };
	singleton: boolean;
	/** Whether to show this app in the Dock. Defaults to true. */
	showInDock?: boolean;
	/** Dock group. "utility" apps appear after the separator. Defaults to "main". */
	dockGroup?: "main" | "utility";
}

const APP_REGISTRY = new Map<string, AppDefinition>();

export function registerApp(app: AppDefinition) {
	APP_REGISTRY.set(app.id, app);
}

export function getApp(id: string): AppDefinition | undefined {
	return APP_REGISTRY.get(id);
}

export function getAllApps(): AppDefinition[] {
	return Array.from(APP_REGISTRY.values());
}
