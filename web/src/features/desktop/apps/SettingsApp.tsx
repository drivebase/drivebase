interface SettingsAppProps {
	windowId: string;
}

export function SettingsApp({ windowId: _ }: SettingsAppProps) {
	return (
		<div className="flex items-center justify-center h-full text-foreground/50">
			<p className="text-sm">Settings</p>
		</div>
	);
}
