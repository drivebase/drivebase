import { msg } from "@lingui/core/macro";
import { useLingui } from "@lingui/react";
import { Link, useNavigate } from "@tanstack/react-router";
import {
	Cloud,
	Folder,
	LayoutDashboard,
	Lock,
	Settings,
	Star,
	Trash2,
} from "lucide-react";
import { useMemo } from "react";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
} from "@/components/ui/tooltip";
import {
	getActiveWorkspaceId,
	getWorkspaceColorClass,
	setActiveWorkspaceId,
	useWorkspaces,
} from "@/features/workspaces";

const navItems = [
	{ icon: LayoutDashboard, label: msg`Dashboard`, to: "/" },
	{ icon: Folder, label: msg`Files`, to: "/files" },
	{ icon: Star, label: msg`Favorites`, to: "/favorites" },
	{ icon: Cloud, label: msg`Providers`, to: "/providers" },
	{ icon: Lock, label: msg`Vault`, to: "/vault" },
	{ icon: Settings, label: msg`Settings`, to: "/settings" },
];

export function Sidebar() {
	const { i18n } = useLingui();
	const navigate = useNavigate();
	const [{ data }] = useWorkspaces(false);

	const activeWorkspaceId = getActiveWorkspaceId();
	const workspaces = data?.workspaces ?? [];
	const activeWorkspace =
		workspaces.find((workspace) => workspace.id === activeWorkspaceId) ??
		workspaces[0] ??
		null;

	const workspaceAvatarInitial = useMemo(() => {
		if (!activeWorkspace?.name) {
			return "W";
		}
		return activeWorkspace.name.charAt(0).toUpperCase();
	}, [activeWorkspace?.name]);

	function handleSwitchWorkspace(workspaceId: string) {
		setActiveWorkspaceId(workspaceId);
		window.location.reload();
	}

	return (
		<div className="h-full w-20 flex flex-col items-center py-5 gap-6 shrink-0 border-r">
			<div className="flex items-center justify-center text-primary">
				<img src="/drivebase.svg" alt="Logo" className="w-12 h-12" />
			</div>
			<TooltipProvider>
				<nav className="flex flex-col items-center gap-3 w-full flex-1">
					{navItems.map((item) => (
						<Tooltip key={item.to} delayDuration={0}>
							<TooltipTrigger asChild>
								<Link
									to={item.to}
									className="w-12 h-12  transition-all duration-200 flex items-center justify-center shrink-0"
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
							</TooltipTrigger>
							<TooltipContent side="right">
								<p>{i18n._(item.label)}</p>
							</TooltipContent>
						</Tooltip>
					))}
				</nav>

				<DropdownMenu>
					<Tooltip delayDuration={0}>
						<TooltipTrigger asChild>
							<DropdownMenuTrigger asChild>
								<button
									type="button"
									className={`w-12 h-12  flex items-center justify-center text-sm font-semibold border border-border/60 ${getWorkspaceColorClass(
										activeWorkspace?.color,
									)}`}
								>
									{workspaceAvatarInitial}
								</button>
							</DropdownMenuTrigger>
						</TooltipTrigger>
						<TooltipContent side="right">
							<p>{activeWorkspace?.name ?? i18n._(msg`Workspace`)}</p>
						</TooltipContent>
					</Tooltip>

					<DropdownMenuContent align="start" className="min-w-52">
						<DropdownMenuLabel>{i18n._(msg`Workspaces`)}</DropdownMenuLabel>
						<DropdownMenuSeparator />
						{workspaces.map((workspace) => (
							<DropdownMenuItem
								key={workspace.id}
								onClick={() => handleSwitchWorkspace(workspace.id)}
							>
								<div
									className={`w-3 h-3  mr-2 ${getWorkspaceColorClass(workspace.color)}`}
								/>
								<span className="flex-1 truncate">{workspace.name}</span>
								{workspace.id === activeWorkspace?.id ? "✓" : null}
							</DropdownMenuItem>
						))}
						<DropdownMenuSeparator />
						<DropdownMenuItem
							onClick={() => navigate({ to: "/workspaces/create" })}
						>
							{i18n._(msg`Create workspace`)}
						</DropdownMenuItem>
					</DropdownMenuContent>
				</DropdownMenu>
			</TooltipProvider>
		</div>
	);
}
