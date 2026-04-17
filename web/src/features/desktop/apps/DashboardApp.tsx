interface DashboardAppProps {
	windowId: string;
}

export function DashboardApp({ windowId: _ }: DashboardAppProps) {
	return (
		<div className="flex items-center justify-center h-full text-foreground/50">
			<p className="text-sm">Dashboard</p>
		</div>
	);
}
