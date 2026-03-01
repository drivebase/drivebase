import type { IconType as LucideIcon } from "react-icons";
import {
	PiCloud as Cloud,
	PiFolderOpen as FolderOpen,
	PiLock as Lock,
	PiGear as Settings,
	PiStar as Star,
} from "react-icons/pi";

export const SEARCH_LIMIT = 10;
export const RECENT_LIMIT = 3;

export type NavigationItem = {
	label: string;
	to: string;
	icon: LucideIcon;
};

export const NAVIGATION_ITEMS: NavigationItem[] = [
	{ label: "Files", to: "/files", icon: FolderOpen },
	{ label: "Starred", to: "/starred", icon: Star },
	{ label: "Providers", to: "/providers", icon: Cloud },
	{ label: "Vault", to: "/vault", icon: Lock },
	{ label: "Settings", to: "/settings/general", icon: Settings },
];
