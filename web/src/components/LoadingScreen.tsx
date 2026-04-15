export function LoadingScreen() {
	return (
		<div className="fixed inset-0 flex items-center justify-center bg-background">
			<img
				src="/logo.svg"
				alt="Drivebase"
				className="w-10 h-10 animate-pulse rounded-xl"
			/>
		</div>
	);
}
