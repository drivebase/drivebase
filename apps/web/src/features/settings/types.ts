import type { LucideIcon } from "lucide-react";

export interface SettingsSection {
	id: string;
	title: string;
	description: string;
	icon: LucideIcon;
	component: React.ComponentType;
}
