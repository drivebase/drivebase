import type { MessageDescriptor } from "@lingui/core";
import { msg } from "@lingui/core/macro";
import { useLingui } from "@lingui/react";
import { Link } from "@tanstack/react-router";
import {
	Cloud,
	Folder,
	InfoIcon,
	LayoutDashboard,
	Lock,
	type LucideIcon,
	Settings,
	Star,
} from "lucide-react";
import { WorkspaceSwitcher } from "@/components/layout/sidebar/WorkspaceSwitcher";
import {
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
} from "@/components/ui/tooltip";
import { useAppUpdate } from "@/shared/hooks/useAppUpdate";

type NavItem = {
	icon: LucideIcon;
	label: MessageDescriptor;
	to: string;
};

const topNavItems: NavItem[] = [
	{ icon: LayoutDashboard, label: msg`Dashboard`, to: "/" },
	{ icon: Folder, label: msg`Files`, to: "/files" },
	{ icon: Star, label: msg`Starred`, to: "/starred" },
	{ icon: Cloud, label: msg`Providers`, to: "/providers" },
];

const bottomNavItems: NavItem[] = [
	{ icon: Lock, label: msg`Vault`, to: "/vault" },
	{ icon: Settings, label: msg`Settings`, to: "/settings/general" },
];

type SidebarItemProps = {
	icon: LucideIcon;
	label: string;
	to: string;
};

function SidebarItem({ icon: Icon, label, to }: SidebarItemProps) {
	return (
		<Tooltip delayDuration={0}>
			<TooltipTrigger asChild>
				<Link
					to={to}
					className="w-12 h-12 transition-all duration-200 flex items-center justify-center shrink-0"
					activeProps={{
						className: "bg-primary/10 text-primary",
					}}
					inactiveProps={{
						className:
							"text-muted-foreground hover:text-foreground hover:bg-muted/50",
					}}
				>
					<Icon size={24} />
				</Link>
			</TooltipTrigger>
			<TooltipContent side="right">
				<p>{label}</p>
			</TooltipContent>
		</Tooltip>
	);
}

export function Sidebar() {
	const { i18n } = useLingui();
	const { isUpdateAvailable, latestGithubVersion, githubRepo } = useAppUpdate();

	return (
		<div className="h-full w-20 flex flex-col items-center py-5 gap-6 shrink-0 border-r">
			<div className="flex items-center justify-center text-primary h-10">
				<img src="/drivebase.svg" alt="Logo" className="w-12 h-12" />
			</div>
			<TooltipProvider>
				<nav className="flex flex-col items-center gap-1.5 w-full flex-1">
					{topNavItems.map((item) => (
						<SidebarItem
							key={item.to}
							icon={item.icon}
							label={i18n._(item.label)}
							to={item.to}
						/>
					))}
				</nav>

				{isUpdateAvailable && (
					<Tooltip delayDuration={0}>
						<TooltipTrigger asChild>
							<a
								href={`https://github.com/${githubRepo}/releases/latest`}
								target="_blank"
								rel="noreferrer noopener"
								className="w-12 h-12 flex items-center justify-center text-sm font-semibold"
							>
								<InfoIcon />
							</a>
						</TooltipTrigger>
						<TooltipContent side="right">
							<p>
								{i18n._(
									msg`Update available: v${latestGithubVersion ?? "unknown"})`,
								)}
							</p>
						</TooltipContent>
					</Tooltip>
				)}

				<nav className="flex flex-col items-center gap-1.5 w-full">
					{bottomNavItems.map((item) => (
						<SidebarItem
							key={item.to}
							icon={item.icon}
							label={i18n._(item.label)}
							to={item.to}
						/>
					))}
				</nav>

				<WorkspaceSwitcher />
			</TooltipProvider>
		</div>
	);
}
