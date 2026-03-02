import { usePaletteActions } from "./usePaletteActions";
import { usePaletteSearchData } from "./usePaletteSearchData";
import { usePaletteUiState } from "./usePaletteUiState";

export function useCommandPaletteController() {
	const state = usePaletteUiState();
	const searchData = usePaletteSearchData({
		open: state.open,
		hasQuery: state.hasQuery,
		debouncedQuery: state.debouncedQuery,
		deletedFileIds: state.deletedFileIds,
		searchMode: state.searchMode,
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
		hasQuery: state.hasQuery,
		selectedFile: state.selectedFile,
		setSelectedFile: state.setSelectedFile,
		searchMode: state.searchMode,
		setSearchMode: state.setSearchMode,
		visibleRecentFiles: searchData.visibleRecentFiles,
		matchedNavigationItems: searchData.matchedNavigationItems,
		visibleFileResults: searchData.visibleFileResults,
		visibleFolderResults: searchData.visibleFolderResults,
		mergedResultsCount: searchData.mergedResultsCount,
		smartSearchResults: searchData.smartSearchResults,
		isSmartSearchFetching: searchData.isSmartSearchFetching,
		navigateTo: actions.navigateTo,
		openFolder: actions.openFolder,
		openFile: actions.openFile,
		handleDeleteFile: actions.handleDeleteFile,
		handleToggleStar: actions.handleToggleStar,
		handleDownloadFile: actions.handleDownloadFile,
	};
}
