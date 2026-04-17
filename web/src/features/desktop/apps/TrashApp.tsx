interface TrashAppProps {
	windowId: string;
}

export function TrashApp({ windowId: _ }: TrashAppProps) {
	return (
		<div className="flex items-center justify-center h-full text-foreground/50">
			<p className="text-sm">Trash</p>
		</div>
	);
}
