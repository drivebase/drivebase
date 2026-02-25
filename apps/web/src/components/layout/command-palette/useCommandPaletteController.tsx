import { usePaletteActions } from "./usePaletteActions";
import { usePaletteSearchData } from "./usePaletteSearchData";
import { usePaletteUiState } from "./usePaletteUiState";

export function useCommandPaletteController() {
	const state = usePaletteUiState();
	const searchData = usePaletteSearchData({
		open: state.open,
		isAiMode: state.isAiMode,
		hasQuery: state.hasQuery,
		debouncedQuery: state.debouncedQuery,
		deletedFileIds: state.deletedFileIds,
	});
	const actions = usePaletteActions({
		selectedFile: state.selectedFile,
		setSelectedFile: state.setSelectedFile,
		setDeletedFileIds: state.setDeletedFileIds,
		setOpen: state.setOpen,
	});

	return {
		open: state.open,
		setOpen: state.setOpen,
		query: state.query,
		setQuery: state.setQuery,
		isAiMode: state.isAiMode,
		toggleAiMode: state.toggleAiMode,
		hasQuery: state.hasQuery,
		selectedFile: state.selectedFile,
		setSelectedFile: state.setSelectedFile,
		aiProcessingDisabled: searchData.aiProcessingDisabled,
		visibleRecentFiles: searchData.visibleRecentFiles,
		matchedNavigationItems: searchData.matchedNavigationItems,
		visibleAiFileResults: searchData.visibleAiFileResults,
		visibleFileResults: searchData.visibleFileResults,
		visibleFolderResults: searchData.visibleFolderResults,
		mergedResultsCount: searchData.mergedResultsCount,
		navigateTo: actions.navigateTo,
		openFolder: actions.openFolder,
		openFile: actions.openFile,
		handleDeleteFile: actions.handleDeleteFile,
		handleToggleStar: actions.handleToggleStar,
		handleDownloadFile: actions.handleDownloadFile,
	};
}
