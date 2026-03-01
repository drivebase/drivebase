import {
	PiDownload as Download,
	PiFile as File,
	PiMagnifyingGlass as Search,
	PiStar as Star,
	PiTrash as Trash2,
} from "react-icons/pi";
import {
	CommandGroup,
	CommandItem,
	CommandSeparator,
} from "@/components/ui/command";
import type { FileItemFragment } from "@/gql/graphql";

type Props = {
	selectedFile: FileItemFragment;
	onBack: () => void;
	onOpen: (file: FileItemFragment) => void;
	onDownload: (file: FileItemFragment) => Promise<void>;
	onToggleStar: (file: FileItemFragment) => Promise<void>;
	onDelete: (file: FileItemFragment) => Promise<void>;
};

export function SelectedFileActionsGroup({
	selectedFile,
	onBack,
	onOpen,
	onDownload,
	onToggleStar,
	onDelete,
}: Props) {
	return (
		<CommandGroup heading="Actions">
			<CommandItem onSelect={onBack}>
				<Search className="h-4 w-4" />
				Back to results
			</CommandItem>
			<CommandSeparator />
			<CommandItem onSelect={() => onOpen(selectedFile)}>
				<File className="h-4 w-4" />
				Open
			</CommandItem>
			<CommandItem onSelect={() => void onDownload(selectedFile)}>
				<Download className="h-4 w-4" />
				Download
			</CommandItem>
			<CommandItem onSelect={() => void onToggleStar(selectedFile)}>
				<Star className="h-4 w-4" />
				{selectedFile.starred ? "Remove from Starred" : "Add to Starred"}
			</CommandItem>
			<CommandItem onSelect={() => void onDelete(selectedFile)}>
				<Trash2 className="h-4 w-4" />
				Delete
			</CommandItem>
		</CommandGroup>
	);
}
