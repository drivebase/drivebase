import { FileInfoPanel } from "@/features/files/FileInfoPanel";
import { useDownload } from "@/features/files/hooks/useDownload";
import type { FileItemFragment } from "@/gql/graphql";
import { useRightPanelStore } from "@/shared/store/rightPanelStore";

export function useFileActions() {
	const { downloadFile } = useDownload();
	const setRightPanelContent = useRightPanelStore((state) => state.setContent);

	const showDetails = (file: FileItemFragment) => {
		setRightPanelContent(<FileInfoPanel fileId={file.id} />);
	};

	return { showDetails, downloadFile };
}
