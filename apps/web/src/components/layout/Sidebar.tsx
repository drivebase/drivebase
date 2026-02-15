import { Link } from "@tanstack/react-router";
import {
	Cloud,
	Folder,
	LayoutDashboard,
	RefreshCcwDot,
	Settings,
	Star,
	Trash2,
} from "lucide-react";
import { useAppUpdate } from "@/shared/hooks/useAppUpdate";

const navItems = [
	{ icon: LayoutDashboard, label: "Dashboard", to: "/" },
	{ icon: Folder, label: "Files", to: "/files" },
	{ icon: Star, label: "Favorites", to: "/favorites" },
	{ icon: Cloud, label: "Providers", to: "/providers" },
	{ icon: Trash2, label: "Trash", to: "/trash" },
	{ icon: Settings, label: "Settings", to: "/settings" },
];

export function Sidebar() {
	const { isUpdateAvailable, latestGithubVersion, githubRepo } = useAppUpdate();

	return (
		<div className="h-full w-20 flex flex-col items-center py-8 gap-10 shrink-0">
			<div className="flex items-center justify-center text-primary">
				<img src="/drivebase.svg" alt="Logo" className="w-12 h-12" />
			</div>
			{isUpdateAvailable ? (
				<a
					href={`https://github.com/${githubRepo}/releases/latest`}
					target="_blank"
					rel="noreferrer noopener"
					className="w-[64px] rounded-lg px-2 py-1.5 bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300 text-[10px] leading-tight text-center font-semibold"
					title={
						latestGithubVersion
							? `Latest: ${latestGithubVersion}`
							: "Update available"
					}
				>
					<div className="flex items-center justify-center gap-1 mb-0.5">
						<RefreshCcwDot size={10} />
						<span>Update</span>
					</div>
					<div>Available</div>
				</a>
			) : null}
			<nav className="flex flex-col items-center gap-6 w-full">
				{navItems.map((item) => (
					<Link
						key={item.label}
						to={item.to}
						className="w-12 h-12 rounded-xl transition-all duration-200 flex items-center justify-center shrink-0"
						activeProps={{
							className: "bg-primary/10 text-primary",
						}}
						inactiveProps={{
							className:
								"text-muted-foreground hover:text-foreground hover:bg-muted/50",
						}}
					>
						<item.icon size={24} />
					</Link>
				))}
			</nav>
		</div>
	);
}
