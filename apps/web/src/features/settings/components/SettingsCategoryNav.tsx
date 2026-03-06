import { Trans } from "@lingui/react/macro";
import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";
import {
	PiFunnel as Filter,
	PiKey as Key,
	PiGlobeHemisphereWest as Globe,
	PiSlidersHorizontal as SlidersHorizontal,
	PiUser as User,
	PiUsers as Users,
	PiWrench as Wrench,
} from "react-icons/pi";
import { useMemo } from "react";
import { useAuthStore } from "@/features/auth/store/authStore";
import {
	can,
	getActiveWorkspaceId,
	useWorkspaceMembers,
} from "@/features/workspaces";

type SettingsCategory = {
	to:
		| "/settings/general"
		| "/settings/account"
		| "/settings/users"
		| "/settings/rules"
		| "/settings/advanced"
		| "/settings/api-keys"
		| "/settings/webdav";
	icon: typeof SlidersHorizontal;
	label: ReactNode;
	adminOnly?: boolean;
};

const categories: SettingsCategory[] = [
	{
		to: "/settings/general",
		icon: SlidersHorizontal,
		label: <Trans>General</Trans>,
	},
	{
		to: "/settings/account",
		icon: User,
		label: <Trans>Account</Trans>,
	},
	{
		to: "/settings/users",
		icon: Users,
		label: <Trans>Users</Trans>,
	},
	{
		to: "/settings/rules",
		icon: Filter,
		label: <Trans>Rules</Trans>,
	},
	{
		to: "/settings/advanced",
		icon: Wrench,
		label: <Trans>Advanced</Trans>,
	},
	{
		to: "/settings/api-keys",
		icon: Key,
		label: <Trans>API Keys</Trans>,
	},
	{
		to: "/settings/webdav",
		icon: Globe,
		label: <Trans>WebDAV</Trans>,
		adminOnly: true,
	},
] as const;

export function SettingsCategoryNav() {
	const workspaceId = getActiveWorkspaceId();
	const currentUserId = useAuthStore((state) => state.user?.id ?? null);
	const [membersResult] = useWorkspaceMembers(workspaceId ?? "", !workspaceId);
	const currentWorkspaceRole = useMemo(() => {
		if (!currentUserId) return null;
		return (
			membersResult.data?.workspaceMembers.find(
				(member) => member.userId === currentUserId,
			)?.role ?? null
		);
	}, [currentUserId, membersResult.data?.workspaceMembers]);
	const visibleCategories = categories.filter(
		(category) =>
			!category.adminOnly || can(currentWorkspaceRole, "providers.manage"),
	);

	return (
		<nav className="w-72 border-r shrink-0 h-full flex flex-col">
			<ul>
				{visibleCategories.map((category) => (
					<li key={category.to}>
						<Link
							to={category.to}
							className="flex items-center gap-3  px-3 py-4 text-sm transition-colors"
							activeProps={{
								className: "bg-primary/10 text-primary",
							}}
							inactiveProps={{
								className:
									"text-muted-foreground hover:text-foreground hover:bg-muted/50",
							}}
						>
							<category.icon className="h-6 w-6 min-w-6" />
							{category.label}
						</Link>
					</li>
				))}
			</ul>
			<div className="mt-auto px-3 py-4 text-xs border-t text-muted-foreground">
				<div className="uppercase tracking-wide mb-1">Workspace ID</div>
				<div className="font-mono break-all">
					{workspaceId ?? "No workspace selected"}
				</div>
			</div>
		</nav>
	);
}
