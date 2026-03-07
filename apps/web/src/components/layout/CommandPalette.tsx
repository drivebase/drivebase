import { useCallback, useMemo } from "react";
import { Badge } from "@/components/ui/badge";
import {
	Command,
	CommandDialog,
	CommandInput,
	CommandList,
} from "@/components/ui/command";
import { getActiveWorkspaceId, useWorkspaces } from "@/features/workspaces";
import { CommandPaletteTrigger } from "./command-palette/CommandPaletteTrigger";
import { IdleStateGroups } from "./command-palette/IdleStateGroups";
import { SearchResultsGroups } from "./command-palette/SearchResultsGroups";
import { SelectedFileActionsGroup } from "./command-palette/SelectedFileActionsGroup";
import { useCommandPaletteController } from "./command-palette/useCommandPaletteController";

export function CommandPalette() {
	const controller = useCommandPaletteController();
	const [workspacesResult] = useWorkspaces(false);

	const smartSearchEnabled = useMemo(() => {
		const workspaceId = getActiveWorkspaceId();
		const workspaces = workspacesResult.data?.workspaces;
		if (!workspaces || !workspaceId) return false;
		const ws = (
			workspaces as Array<{ id: string; smartSearchEnabled: boolean }>
		).find((w) => w.id === workspaceId);
		return ws?.smartSearchEnabled ?? false;
	}, [workspacesResult.data]);

	const isSmartMode = controller.searchMode === "smart";

	const handleKeyDown = useCallback(
		(e: React.KeyboardEvent) => {
			if (e.key === "Tab" && smartSearchEnabled && !controller.selectedFile) {
				e.preventDefault();
				controller.setSearchMode(isSmartMode ? "filename" : "smart");
			}
		},
		[smartSearchEnabled, isSmartMode, controller],
	);

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
					<Command
						shouldFilter={false}
						className="w-full"
						onKeyDown={handleKeyDown}
					>
						<div className="relative">
							<CommandInput
								placeholder={
									isSmartMode
										? "Search file contents..."
										: "Search files and folders..."
								}
								value={controller.query}
								onValueChange={controller.setQuery}
							/>
							{smartSearchEnabled && (
								<div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1.5">
									{isSmartMode && (
										<Badge variant="secondary" className="text-xs px-1.5 py-0">
											Smart Search
										</Badge>
									)}
									<kbd className="pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground">
										Tab
									</kbd>
								</div>
							)}
						</div>
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
									matchedCommunityItems={controller.matchedCommunityItems}
									visibleFileResults={controller.visibleFileResults}
									visibleFolderResults={controller.visibleFolderResults}
									totalResultsCount={controller.totalResultsCount}
									smartSearchResults={controller.smartSearchResults}
									isSmartMode={isSmartMode}
									onSelectNavigation={controller.navigateTo}
									onSelectCommunityItem={controller.openExternalLink}
									onSelectFile={controller.setSelectedFile}
									onSelectFolder={controller.openFolder}
								/>
							) : (
								<IdleStateGroups
									onSelectNavigation={controller.navigateTo}
									onSelectCommunityItem={controller.openExternalLink}
								/>
							)}
						</CommandList>
					</Command>
				</div>
			</CommandDialog>
		</>
	);
}
