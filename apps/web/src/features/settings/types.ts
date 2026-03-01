import type { LucideIcon } from "@/shared/components/icons/solar";

export interface SettingsSection {
	id: string;
	title: string;
	description: string;
	icon: LucideIcon;
	component: React.ComponentType;
}
