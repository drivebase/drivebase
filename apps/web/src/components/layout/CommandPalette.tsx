import {
	Command,
	CommandDialog,
	CommandEmpty,
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
							placeholder={
								controller.isAiMode
									? "AI mode: describe what you want to find"
									: "Search files and folders... (Press Tab for AI Mode)"
							}
							value={controller.query}
							onValueChange={controller.setQuery}
							onKeyDown={(event) => {
								if (event.key === "Tab") {
									event.preventDefault();
									controller.toggleAiMode();
								}
							}}
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
									isAiMode={controller.isAiMode}
									aiProcessingDisabled={controller.aiProcessingDisabled}
									matchedNavigationItems={controller.matchedNavigationItems}
									visibleAiFileResults={controller.visibleAiFileResults}
									visibleFileResults={controller.visibleFileResults}
									visibleFolderResults={controller.visibleFolderResults}
									mergedResultsCount={controller.mergedResultsCount}
									onSelectNavigation={controller.navigateTo}
									onSelectAiFile={controller.setSelectedFile}
									onSelectFile={controller.setSelectedFile}
									onSelectFolder={controller.openFolder}
								/>
							) : controller.isAiMode ? (
								controller.aiProcessingDisabled ? (
									<CommandEmpty>
										AI processing is disabled for this workspace. Enable it from
										Settings {" > "} AI.
									</CommandEmpty>
								) : (
									<CommandEmpty>
										Type a query to search in AI mode.
									</CommandEmpty>
								)
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
