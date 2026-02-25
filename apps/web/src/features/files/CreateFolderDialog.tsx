import { Loader2 } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { useCreateFolder } from "@/features/files/hooks/useFolders";
import { ProviderIcon } from "@/features/providers/ProviderIcon";
import type { CreateFolderMutation } from "@/gql/graphql";

type CreatedFolder = CreateFolderMutation["createFolder"];

interface Provider {
	id: string;
	name: string;
	type: string;
	isActive: boolean;
}

interface CreateFolderDialogProps {
	isOpen: boolean;
	onClose: () => void;
	parentId?: string;
	providers?: Provider[];
	onCreated?: (folder: CreatedFolder) => void;
}

export function CreateFolderDialog({
	isOpen,
	onClose,
	parentId,
	providers,
	onCreated,
}: CreateFolderDialogProps) {
	const [name, setName] = useState("");
	const [selectedProviderId, setSelectedProviderId] = useState<string>("");
	const [{ fetching }, createFolder] = useCreateFolder();

	const activeProviders = providers?.filter((p) => p.isActive) ?? [];

	// Auto-select if only one provider
	const effectiveProviderId =
		activeProviders.length === 1 ? activeProviders[0].id : selectedProviderId;

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		if (!name.trim() || !effectiveProviderId) return;

		const result = await createFolder({
			input: {
				name: name.trim(),
				parentId,
				providerId: effectiveProviderId,
			},
		});

		if (!result.error) {
			if (result.data?.createFolder) {
				onCreated?.(result.data.createFolder);
			}
			setName("");
			setSelectedProviderId("");
			onClose();
		}
	};

	return (
		<Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
			<DialogContent className="sm:max-w-106.25">
				<DialogHeader>
					<DialogTitle>Create Folder</DialogTitle>
					<DialogDescription>
						Enter a name for your new folder and choose where to create it.
					</DialogDescription>
				</DialogHeader>
				<form onSubmit={handleSubmit}>
					<div className="grid gap-4 py-4">
						<div className="grid gap-2">
							<Label htmlFor="name">Folder Name</Label>
							<Input
								id="name"
								value={name}
								onChange={(e) => setName(e.target.value)}
								placeholder="New Folder"
								autoFocus
							/>
						</div>
						{activeProviders.length > 1 ? (
							<div className="grid gap-2">
								<Label>Storage Provider</Label>
								<Select
									value={selectedProviderId}
									onValueChange={setSelectedProviderId}
								>
									<SelectTrigger>
										<SelectValue placeholder="Select a provider" />
									</SelectTrigger>
									<SelectContent>
										{activeProviders.map((provider) => (
											<SelectItem key={provider.id} value={provider.id}>
												<div className="flex items-center gap-2">
													<ProviderIcon
														type={provider.type}
														className="h-4 w-4"
													/>
													{provider.name}
												</div>
											</SelectItem>
										))}
									</SelectContent>
								</Select>
							</div>
						) : null}
					</div>
					<DialogFooter>
						<Button
							type="button"
							variant="ghost"
							onClick={onClose}
							disabled={fetching}
						>
							Cancel
						</Button>
						<Button
							type="submit"
							disabled={fetching || !name.trim() || !effectiveProviderId}
						>
							{fetching && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
							Create Folder
						</Button>
					</DialogFooter>
				</form>
			</DialogContent>
		</Dialog>
	);
}
