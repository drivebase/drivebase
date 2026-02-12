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
import { useCreateFolder } from "@/hooks/useFolders";

interface CreateFolderDialogProps {
	isOpen: boolean;
	onClose: () => void;
	parentId?: string;
}

export function CreateFolderDialog({
	isOpen,
	onClose,
	parentId,
}: CreateFolderDialogProps) {
	const [name, setName] = useState("");
	const [{ fetching }, createFolder] = useCreateFolder();

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		if (!name.trim()) return;

		const { error } = await createFolder({
			input: {
				name: name.trim(),
				parentId,
			},
		});

		if (!error) {
			setName("");
			onClose();
		}
	};

	return (
		<Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
			<DialogContent className="sm:max-w-[425px]">
				<DialogHeader>
					<DialogTitle>Create Folder</DialogTitle>
					<DialogDescription>
						Enter a name for your new folder.
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
						<Button type="submit" disabled={fetching || !name.trim()}>
							{fetching && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
							Create Folder
						</Button>
					</DialogFooter>
				</form>
			</DialogContent>
		</Dialog>
	);
}
