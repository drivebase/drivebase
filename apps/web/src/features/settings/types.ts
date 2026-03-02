import type { IconType as LucideIcon } from "react-icons";

export interface SettingsSection {
	id: string;
	title: string;
	description: string;
	icon: LucideIcon;
	component: React.ComponentType;
}
