import { Link } from "@tanstack/react-router";
import { Folder } from "lucide-react";
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
	isAiMode: boolean;
	aiProcessingDisabled: boolean;
	matchedNavigationItems: NavigationItem[];
	visibleAiFileResults: FileItemFragment[];
	visibleFileResults: FileItemFragment[];
	visibleFolderResults: FolderItemFragment[];
	mergedResultsCount: number;
	onSelectNavigation: (to: string) => void;
	onSelectAiFile: (file: FileItemFragment) => void;
	onSelectFile: (file: FileItemFragment) => void;
	onSelectFolder: (folderId: string) => void;
};

export function SearchResultsGroups({
	isAiMode,
	aiProcessingDisabled,
	matchedNavigationItems,
	visibleAiFileResults,
	visibleFileResults,
	visibleFolderResults,
	mergedResultsCount,
	onSelectNavigation,
	onSelectAiFile,
	onSelectFile,
	onSelectFolder,
}: Props) {
	return (
		<>
			{!isAiMode && matchedNavigationItems.length > 0 ? (
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
			{isAiMode && visibleAiFileResults.length > 0 ? (
				<CommandGroup heading="AI Results">
					{visibleAiFileResults.map((file) => (
						<CommandItem
							key={`ai-file:${file.id}`}
							onSelect={() => onSelectAiFile(file)}
						>
							<ProviderIcon type={file.provider.type} className="h-4 w-4" />
							<span className="flex-1 truncate">{file.name}</span>
							<CommandShortcut>{formatSize(file.size)}</CommandShortcut>
						</CommandItem>
					))}
				</CommandGroup>
			) : null}
			{!isAiMode && visibleFileResults.length > 0 ? (
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
			{!isAiMode && visibleFolderResults.length > 0 ? (
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
			{isAiMode && aiProcessingDisabled ? (
				<CommandEmpty asChild>
					<div className="space-y-2">
						<h1 className="font-medium">AI processing is disabled.</h1>
						<p className="text-muted-foreground">
							Enable from{" "}
							<Link to="/settings/ai" className="underline">
								Settings &gt; AI
							</Link>
						</p>
					</div>
				</CommandEmpty>
			) : null}
			{isAiMode &&
			!aiProcessingDisabled &&
			visibleAiFileResults.length === 0 ? (
				<CommandEmpty>No AI results found.</CommandEmpty>
			) : null}
			{!isAiMode && mergedResultsCount === 0 ? (
				<CommandEmpty>No results found.</CommandEmpty>
			) : null}
		</>
	);
}
