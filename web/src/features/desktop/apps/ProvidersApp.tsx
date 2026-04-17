interface ProvidersAppProps {
	windowId: string;
}

export function ProvidersApp({ windowId: _ }: ProvidersAppProps) {
	return (
		<div className="flex items-center justify-center h-full text-foreground/50">
			<p className="text-sm">Providers</p>
		</div>
	);
}
