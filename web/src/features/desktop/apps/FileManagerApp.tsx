interface FileManagerAppProps {
	windowId: string;
}

export function FileManagerApp({ windowId: _ }: FileManagerAppProps) {
	return (
		<div className="flex items-center justify-center h-full text-foreground/50">
			<p className="text-sm">File Manager</p>
		</div>
	);
}
