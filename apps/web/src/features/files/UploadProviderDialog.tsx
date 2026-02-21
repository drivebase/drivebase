import { formatBytes } from "@drivebase/utils";
import { FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { ProviderIcon } from "@/features/providers/ProviderIcon";
import type { StorageProvider } from "@/gql/graphql";
import { cn } from "@/shared/lib/utils";

interface UploadProviderDialogProps {
	isOpen: boolean;
	onClose: () => void;
	providers: StorageProvider[];
	fileName?: string;
	fileMimeType?: string;
	fileSize?: number;
	onSelectProvider: (providerId: string) => void;
}

export function UploadProviderDialog({
	isOpen,
	onClose,
	providers,
	fileName,
	fileMimeType,
	fileSize,
	onSelectProvider,
}: UploadProviderDialogProps) {
	const sortedProviders = [...providers].sort(
		(a, b) => Number(b.isActive) - Number(a.isActive),
	);

	return (
		<Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
			<DialogContent className="sm:max-w-lg">
				<DialogHeader>
					<DialogTitle>Select Storage Provider</DialogTitle>
					<DialogDescription>
						Choose where this file should be uploaded.
					</DialogDescription>
				</DialogHeader>
				<div className="flex items-start gap-2  border bg-muted/30 px-3 py-2">
					<FileText className="mt-0.5 h-4 w-4 text-muted-foreground" />
					<div className="min-w-0">
						<div className="truncate text-sm font-medium">
							{fileName || "Unknown file"}
						</div>
						<div className="mt-0.5 text-xs text-muted-foreground">
							{fileMimeType || "application/octet-stream"}
							{typeof fileSize === "number"
								? ` • ${formatBytes(fileSize)}`
								: ""}
						</div>
					</div>
				</div>
				<div className="grid grid-cols-2 gap-3">
					{sortedProviders.map((provider) => {
						return (
							<Button
								key={provider.id}
								variant="outline"
								className={cn(
									"h-auto w-full justify-start p-0 text-left transition-all",
									"hover:shadow-sm",
									!provider.isActive && "opacity-70",
								)}
								onClick={() => onSelectProvider(provider.id)}
							>
								<div className="w-full  border border-transparent p-4">
									<div className="flex items-center justify-between gap-3">
										<div className="flex items-center gap-3">
											<div className=" bg-muted p-2">
												<ProviderIcon
													type={provider.type}
													className="h-5 w-5"
												/>
											</div>
											<div>
												<div className="font-semibold leading-tight">
													{provider.name}
												</div>
												<div className="mt-1 text-xs uppercase tracking-wide text-muted-foreground">
													{provider.type.replace("_", " ")}
												</div>
											</div>
										</div>
									</div>
								</div>
							</Button>
						);
					})}
				</div>
			</DialogContent>
		</Dialog>
	);
}
