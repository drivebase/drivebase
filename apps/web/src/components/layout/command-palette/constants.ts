import type { IconType as LucideIcon } from "react-icons";
import {
	PiBug as Bug,
	PiCloud as Cloud,
	PiChatCircleDots as Discord,
	PiFolderOpen as FolderOpen,
	PiGithubLogo as GitHub,
	PiHeart as Heart,
	PiLock as Lock,
	PiGear as Settings,
	PiStar as Star,
} from "react-icons/pi";

export const SEARCH_LIMIT = 10;

export type NavigationItem = {
	label: string;
	to: string;
	icon: LucideIcon;
};

export type CommunityItem = {
	id: "github" | "discord" | "report-bug" | "give-star";
	href: string;
	icon: LucideIcon;
};

export const NAVIGATION_ITEMS: NavigationItem[] = [
	{ label: "Files", to: "/files", icon: FolderOpen },
	{ label: "Starred", to: "/starred", icon: Star },
	{ label: "Providers", to: "/providers", icon: Cloud },
	{ label: "Vault", to: "/vault", icon: Lock },
	{ label: "Settings", to: "/settings/general", icon: Settings },
];

export const COMMUNITY_ITEMS: CommunityItem[] = [
	{
		id: "github",
		href: "https://github.com/drivebase/drivebase",
		icon: GitHub,
	},
	{
		id: "discord",
		href: "https://discord.gg/5hPZwTPp68",
		icon: Discord,
	},
	{
		id: "report-bug",
		href: "https://github.com/drivebase/drivebase/issues/new?template=bug_report.md",
		icon: Bug,
	},
	{
		id: "give-star",
		href: "https://github.com/drivebase/drivebase",
		icon: Heart,
	},
];
