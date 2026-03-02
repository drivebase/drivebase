import {
	Command,
	CommandDialog,
	CommandInput,
	CommandList,
} from "@/components/ui/command";
import { CommandPaletteTrigger } from "./command-palette/CommandPaletteTrigger";
import { IdleStateGroups } from "./command-palette/IdleStateGroups";
import { SearchResultsGroups } from "./command-palette/SearchResultsGroups";
import { SelectedFileActionsGroup } from "./command-palette/SelectedFileActionsGroup";
import { useCommandPaletteController } from "./command-palette/useCommandPaletteController";

export function CommandPalette() {
	const controller = useCommandPaletteController();

	return (
		<>
			<CommandPaletteTrigger onOpen={() => controller.setOpen(true)} />

			<CommandDialog
				open={controller.open}
				onOpenChange={controller.setOpen}
				title="Search"
				description="Search files, folders, and navigation"
			>
				<div className="w-full">
					<Command shouldFilter={false} className="w-full">
						<CommandInput
							placeholder="Search files and folders..."
							value={controller.query}
							onValueChange={controller.setQuery}
						/>
						<CommandList>
							{controller.selectedFile ? (
								<SelectedFileActionsGroup
									selectedFile={controller.selectedFile}
									onBack={() => controller.setSelectedFile(null)}
									onOpen={controller.openFile}
									onDownload={controller.handleDownloadFile}
									onToggleStar={controller.handleToggleStar}
									onDelete={controller.handleDeleteFile}
								/>
							) : controller.hasQuery ? (
								<SearchResultsGroups
									matchedNavigationItems={controller.matchedNavigationItems}
									visibleFileResults={controller.visibleFileResults}
									visibleFolderResults={controller.visibleFolderResults}
									mergedResultsCount={controller.mergedResultsCount}
									onSelectNavigation={controller.navigateTo}
									onSelectFile={controller.setSelectedFile}
									onSelectFolder={controller.openFolder}
								/>
							) : (
								<IdleStateGroups
									recentFiles={controller.visibleRecentFiles}
									onSelectNavigation={controller.navigateTo}
									onSelectRecentFile={controller.setSelectedFile}
								/>
							)}
						</CommandList>
					</Command>
				</div>
			</CommandDialog>
		</>
	);
}
