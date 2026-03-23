import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { ProviderIcon } from "@/features/providers/ProviderIcon";
import { cn } from "@/shared/lib/utils";

interface ProviderOption {
	id: string;
	name: string;
	type: string;
}

interface DestinationProviderDialogProps {
	isOpen: boolean;
	onClose: () => void;
	title: string;
	description: string;
	providers: ProviderOption[];
	onSelectProvider: (providerId: string) => void;
}

export function DestinationProviderDialog({
	isOpen,
	onClose,
	title,
	description,
	providers,
	onSelectProvider,
}: DestinationProviderDialogProps) {
	return (
		<Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
			<DialogContent className="sm:max-w-lg">
				<DialogHeader>
					<DialogTitle>{title}</DialogTitle>
					<DialogDescription>{description}</DialogDescription>
				</DialogHeader>
				<div className="grid grid-cols-2 gap-3">
					{providers.map((provider) => (
						<Button
							key={provider.id}
							variant="outline"
							className={cn(
								"h-auto w-full justify-start p-0 text-left transition-all",
								"hover:shadow-sm",
							)}
							onClick={() => onSelectProvider(provider.id)}
						>
							<div className="w-full border border-transparent p-4">
								<div className="flex items-center gap-3">
									<div className="bg-muted p-2">
										<ProviderIcon type={provider.type} className="h-5 w-5" />
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
						</Button>
					))}
				</div>
			</DialogContent>
		</Dialog>
	);
}
