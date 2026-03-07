import { Trans } from "@lingui/react/macro";
import { PiFile as File, PiFolder as Folder } from "react-icons/pi";
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
import type { CommunityItem, NavigationItem } from "./constants";
import type { SmartSearchResultItem } from "./usePaletteSearchData";

type Props = {
	matchedNavigationItems: NavigationItem[];
	matchedCommunityItems: CommunityItem[];
	visibleFileResults: FileItemFragment[];
	visibleFolderResults: FolderItemFragment[];
	totalResultsCount: number;
	smartSearchResults?: SmartSearchResultItem[];
	isSmartMode?: boolean;
	onSelectNavigation: (to: string) => void;
	onSelectCommunityItem: (href: string) => void;
	onSelectFile: (file: FileItemFragment) => void;
	onSelectFolder: (folderId: string) => void;
};

function renderCommunityLabel(item: CommunityItem) {
	switch (item.id) {
		case "github":
			return <Trans>GitHub</Trans>;
		case "discord":
			return <Trans>Join Discord</Trans>;
		case "report-bug":
			return <Trans>Report Bug</Trans>;
		case "give-star":
			return <Trans>Give a Star</Trans>;
	}
}

function getCommunityValue(item: CommunityItem) {
	switch (item.id) {
		case "github":
			return "github repo repository";
		case "discord":
			return "join discord community chat support";
		case "report-bug":
			return "report bug issue feedback";
		case "give-star":
			return "give a star star on github";
	}
}

export function SearchResultsGroups({
	matchedNavigationItems,
	matchedCommunityItems,
	visibleFileResults,
	visibleFolderResults,
	totalResultsCount,
	smartSearchResults = [],
	isSmartMode = false,
	onSelectNavigation,
	onSelectCommunityItem,
	onSelectFile,
	onSelectFolder,
}: Props) {
	if (isSmartMode) {
		return (
			<>
				{smartSearchResults.length > 0 ? (
					<CommandGroup heading={<Trans>Content Matches</Trans>}>
						{smartSearchResults.map((result) => (
							<CommandItem
								key={`smart:${result.file.id}`}
								value={`${result.file.name} ${result.headline}`}
								onSelect={() => onSelectFile(result.file)}
								className="flex flex-col items-start gap-1 py-2"
							>
								<div className="flex items-center gap-2 w-full">
									<File className="h-4 w-4 shrink-0" />
									<span className="flex-1 truncate font-medium">
										{result.file.name}
									</span>
								</div>
								<span
									className="text-xs text-muted-foreground line-clamp-2 pl-6"
									// biome-ignore lint/security/noDangerouslySetInnerHtml: headline uses safe delimiters
									dangerouslySetInnerHTML={{
										__html: result.headline
											.replace(/<<</g, "<mark>")
											.replace(/>>>/g, "</mark>"),
									}}
								/>
							</CommandItem>
						))}
					</CommandGroup>
				) : (
					<CommandEmpty>
						<Trans>No content matches found.</Trans>
					</CommandEmpty>
				)}
			</>
		);
	}

	return (
		<>
			{matchedNavigationItems.length > 0 ? (
				<>
					<CommandGroup heading={<Trans>Navigation</Trans>}>
						{matchedNavigationItems.map((item) => (
							<CommandItem
								key={`search-nav:${item.to}`}
								value={item.label}
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
			{matchedCommunityItems.length > 0 ? (
				<>
					<CommandGroup heading={<Trans>Community</Trans>}>
						{matchedCommunityItems.map((item) => (
							<CommandItem
								key={`community:${item.id}`}
								value={getCommunityValue(item)}
								onSelect={() => onSelectCommunityItem(item.href)}
							>
								<item.icon className="h-4 w-4" />
								{renderCommunityLabel(item)}
							</CommandItem>
						))}
					</CommandGroup>
					<CommandSeparator />
				</>
			) : null}
			{visibleFileResults.length > 0 ? (
				<CommandGroup heading={<Trans>Files</Trans>}>
					{visibleFileResults.map((file) => (
						<CommandItem
							key={`file:${file.id}`}
							value={file.name}
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
				<CommandGroup heading={<Trans>Folders</Trans>}>
					{visibleFolderResults.map((folder) => (
						<CommandItem
							key={`folder:${folder.id}`}
							value={folder.name}
							onSelect={() => onSelectFolder(folder.id)}
						>
							<ProviderIcon type={folder.provider.type} className="h-4 w-4" />
							<Folder className="h-4 w-4 text-muted-foreground" />
							<span className="truncate">{folder.name}</span>
						</CommandItem>
					))}
				</CommandGroup>
			) : null}
			{totalResultsCount === 0 ? (
				<CommandEmpty>
					<Trans>No results found.</Trans>
				</CommandEmpty>
			) : null}
		</>
	);
}
