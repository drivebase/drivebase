interface FileDropZoneProps {
	isDragActive: boolean;
}

export function FileDropZone({ isDragActive }: FileDropZoneProps) {
	if (!isDragActive) return null;

	return (
		<div className="absolute inset-4 rounded-xl border-2 border-dashed border-primary bg-primary/10 z-40 flex items-center justify-center pointer-events-none">
			<div className="text-center">
				<div className="text-base font-semibold text-foreground">
					Drop files to upload
				</div>
				<div className="text-sm text-muted-foreground">
					Supports multiple files
				</div>
			</div>
		</div>
	);
}
