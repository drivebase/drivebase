import { PiFolder as Folder } from "react-icons/pi";
import {
	CommandEmpty,
	CommandGroup,
	CommandItem,
	CommandSeparator,
	CommandShortcut,
} from "@/components/ui/command";
import { formatSize } from "@/features/files/utils";
import { ProviderIcon } from "@/features/providers/ProviderIcon";
import type { FileItemFragment, FolderItemFragment } from "@/gql/graphql";
import type { NavigationItem } from "./constants";

type Props = {
	matchedNavigationItems: NavigationItem[];
	visibleFileResults: FileItemFragment[];
	visibleFolderResults: FolderItemFragment[];
	mergedResultsCount: number;
	onSelectNavigation: (to: string) => void;
	onSelectFile: (file: FileItemFragment) => void;
	onSelectFolder: (folderId: string) => void;
};

export function SearchResultsGroups({
	matchedNavigationItems,
	visibleFileResults,
	visibleFolderResults,
	mergedResultsCount,
	onSelectNavigation,
	onSelectFile,
	onSelectFolder,
}: Props) {
	return (
		<>
			{matchedNavigationItems.length > 0 ? (
				<>
					<CommandGroup heading="Navigation">
						{matchedNavigationItems.map((item) => (
							<CommandItem
								key={`search-nav:${item.to}`}
								onSelect={() => onSelectNavigation(item.to)}
							>
								<item.icon className="h-4 w-4" />
								{item.label}
							</CommandItem>
						))}
					</CommandGroup>
					<CommandSeparator />
				</>
			) : null}
			{visibleFileResults.length > 0 ? (
				<CommandGroup heading="Files">
					{visibleFileResults.map((file) => (
						<CommandItem
							key={`file:${file.id}`}
							onSelect={() => onSelectFile(file)}
						>
							<ProviderIcon type={file.provider.type} className="h-4 w-4" />
							<span className="flex-1 truncate">{file.name}</span>
							<CommandShortcut>{formatSize(file.size)}</CommandShortcut>
						</CommandItem>
					))}
				</CommandGroup>
			) : null}
			{visibleFolderResults.length > 0 ? (
				<CommandGroup heading="Folders">
					{visibleFolderResults.map((folder) => (
						<CommandItem
							key={`folder:${folder.id}`}
							onSelect={() => onSelectFolder(folder.id)}
						>
							<ProviderIcon type={folder.provider.type} className="h-4 w-4" />
							<Folder className="h-4 w-4 text-muted-foreground" />
							<span className="truncate">{folder.name}</span>
						</CommandItem>
					))}
				</CommandGroup>
			) : null}
			{mergedResultsCount === 0 ? (
				<CommandEmpty>No results found.</CommandEmpty>
			) : null}
		</>
	);
}
