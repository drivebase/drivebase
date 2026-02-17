import { msg } from "@lingui/macro";
import { useLingui } from "@lingui/react";
import { Link } from "@tanstack/react-router";
import {
	Cloud,
	Folder,
	LayoutDashboard,
	Settings,
	Share2,
	Star,
	Trash2,
} from "lucide-react";
import {
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
} from "@/components/ui/tooltip";

const navItems = [
	{ icon: LayoutDashboard, label: msg`Dashboard`, to: "/" },
	{ icon: Folder, label: msg`Files`, to: "/files" },
	{ icon: Star, label: msg`Favorites`, to: "/favorites" },
	{ icon: Share2, label: msg`Shared`, to: "/shared" },
	{ icon: Cloud, label: msg`Providers`, to: "/providers" },
	{ icon: Trash2, label: msg`Trash`, to: "/trash" },
	{ icon: Settings, label: msg`Settings`, to: "/settings" },
];

export function Sidebar() {
	const { i18n } = useLingui();

	return (
		<div className="h-full w-20 flex flex-col items-center py-8 gap-10 shrink-0">
			<div className="flex items-center justify-center text-primary">
				<img src="/drivebase.svg" alt="Logo" className="w-12 h-12" />
			</div>
			<TooltipProvider>
				<nav className="flex flex-col items-center gap-6 w-full">
					{navItems.map((item) => (
						<Tooltip key={item.to} delayDuration={0}>
							<TooltipTrigger asChild>
								<Link
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
							</TooltipTrigger>
							<TooltipContent side="right">
								<p>{i18n._(item.label)}</p>
							</TooltipContent>
						</Tooltip>
					))}
				</nav>
			</TooltipProvider>
		</div>
	);
}
