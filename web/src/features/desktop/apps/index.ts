import {
	FolderOpen,
	LayoutDashboard,
	HardDrive,
	Settings,
	Trash2,
	Plus,
} from "lucide-react";
import { registerApp } from "../app-registry";
import { FileManagerApp } from "./file-manager/FileManagerApp";
import { DashboardApp } from "./DashboardApp";
import { ProvidersApp } from "./ProvidersApp";
import { SettingsApp } from "./SettingsApp";
import { TrashApp } from "./TrashApp";
import { ConnectProviderApp } from "@/features/providers/ConnectProviderApp";
import "./file-manager/context-menu";

registerApp({
	id: "file-manager",
	label: "Files",
	icon: FolderOpen,
	component: FileManagerApp,
	defaultSize: { width: 900, height: 600 },
	minSize: { width: 500, height: 400 },
	singleton: true,
});

registerApp({
	id: "dashboard",
	label: "Dashboard",
	icon: LayoutDashboard,
	component: DashboardApp,
	defaultSize: { width: 800, height: 500 },
	minSize: { width: 400, height: 300 },
	singleton: true,
});

registerApp({
	id: "providers",
	label: "Providers",
	icon: HardDrive,
	component: ProvidersApp,
	defaultSize: { width: 420, height: 550 },
	minSize: { width: 360, height: 400 },
	singleton: true,
});

registerApp({
	id: "connect-provider",
	label: "Connect Provider",
	icon: Plus,
	component: ConnectProviderApp,
	defaultSize: { width: 400, height: 480 },
	minSize: { width: 360, height: 400 },
	singleton: false,
	showInDock: false,
});

registerApp({
	id: "settings",
	label: "Settings",
	icon: Settings,
	component: SettingsApp,
	defaultSize: { width: 700, height: 500 },
	minSize: { width: 400, height: 300 },
	singleton: true,
	dockGroup: "utility",
});

registerApp({
	id: "trash",
	label: "Trash",
	icon: Trash2,
	component: TrashApp,
	defaultSize: { width: 700, height: 500 },
	minSize: { width: 400, height: 300 },
	singleton: true,
	dockGroup: "utility",
});
