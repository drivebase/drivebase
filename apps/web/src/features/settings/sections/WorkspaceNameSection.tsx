import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface WorkspaceNameSectionProps {
	name: string;
	canEdit: boolean;
	isSaving: boolean;
	onNameChange: (value: string) => void;
	onSave: () => void;
}

export function WorkspaceNameSection(props: WorkspaceNameSectionProps) {
	const { name, canEdit, isSaving, onNameChange, onSave } = props;

	return (
		<div className="space-y-6">
			<div>
				<h3 className="text-lg font-medium">Workspace name</h3>
				<p className="text-sm text-muted-foreground">
					Update your workspace display name.
				</p>
			</div>
			<div className="space-y-2 max-w-md">
				<Label>Name</Label>
				<div className="flex gap-2">
					<Input
						value={name}
						onChange={(event) => onNameChange(event.target.value)}
						disabled={!canEdit || isSaving}
					/>
					<Button onClick={onSave} disabled={!canEdit || isSaving}>
						{isSaving ? "Saving..." : "Save"}
					</Button>
				</div>
			</div>
		</div>
	);
}
