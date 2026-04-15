export function StatCard({
	icon,
	label,
	loading,
	children,
}: {
	icon: React.ReactNode;
	label: string;
	loading?: boolean;
	children: React.ReactNode;
}) {
	return (
		<div className="rounded-xl border border-border bg-surface p-4 space-y-3">
			<div className="flex items-center gap-2 text-muted">
				{icon}
				<span className="text-xs font-medium uppercase tracking-wide">{label}</span>
			</div>
			{loading ? (
				<div className="space-y-2">
					<div className="h-7 w-24 rounded-md bg-default animate-pulse" />
					<div className="h-3 w-16 rounded bg-default animate-pulse" />
				</div>
			) : (
				children
			)}
		</div>
	);
}
