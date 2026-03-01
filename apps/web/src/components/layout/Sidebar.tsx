import type { MessageDescriptor } from "@lingui/core";
import { msg } from "@lingui/core/macro";
import { useLingui } from "@lingui/react";
import { Link } from "@tanstack/react-router";
import { WorkspaceSwitcher } from "@/components/layout/sidebar/WorkspaceSwitcher";
import {
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
} from "@/components/ui/tooltip";
import { useAppUpdate } from "@/shared/hooks/useAppUpdate";
import { cn } from "@/shared/lib/utils";

type NavItem = {
	iconClassName: string;
	label: MessageDescriptor;
	to: string;
};

const topNavItems: NavItem[] = [
	{
		iconClassName: "icon-[solar--widget-5-linear]",
		label: msg`Dashboard`,
		to: "/",
	},
	{
		iconClassName: "icon-[solar--folder-linear]",
		label: msg`Files`,
		to: "/files",
	},
	{
		iconClassName: "icon-[solar--star-linear]",
		label: msg`Starred`,
		to: "/starred",
	},
	{
		iconClassName: "icon-[solar--cloud-linear]",
		label: msg`Providers`,
		to: "/providers",
	},
];

const bottomNavItems: NavItem[] = [
	{
		iconClassName: "icon-[solar--lock-linear]",
		label: msg`Vault`,
		to: "/vault",
	},
	{
		iconClassName: "icon-[solar--settings-linear]",
		label: msg`Settings`,
		to: "/settings/general",
	},
];

type SidebarItemProps = {
	iconClassName: string;
	label: string;
	to: string;
};

function SidebarItem({ iconClassName, label, to }: SidebarItemProps) {
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
					<span
						className={cn("inline-block h-6 w-6 shrink-0", iconClassName)}
						aria-hidden="true"
					/>
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
							iconClassName={item.iconClassName}
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
								<span
									className="icon-[solar--info-circle-linear] inline-block h-6 w-6"
									aria-hidden="true"
								/>
								<span className="sr-only">
									{i18n._(msg`Open latest release notes`)}
								</span>
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
							iconClassName={item.iconClassName}
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
