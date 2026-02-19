import { Trans } from "@lingui/react/macro";
import { Link } from "@tanstack/react-router";
import { SlidersHorizontal, User, Users, Wrench } from "lucide-react";

const categories = [
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
		to: "/settings/advanced",
		icon: Wrench,
		label: <Trans>Advanced</Trans>,
	},
] as const;

export function SettingsCategoryNav() {
	return (
		<nav className="w-72 shrink-0 pr-4">
			<ul className="space-y-1">
				{categories.map((category) => (
					<li key={category.to}>
						<Link
							to={category.to}
							className="flex items-center gap-3 rounded-md px-3 py-4 text-sm transition-colors"
							activeProps={{
								className: "bg-primary/10 text-primary",
							}}
							inactiveProps={{
								className:
									"text-muted-foreground hover:text-foreground hover:bg-muted/50",
							}}
						>
							<category.icon className="h-5 w-5 min-w-5" />
							{category.label}
						</Link>
					</li>
				))}
			</ul>
		</nav>
	);
}
