import axios from "axios";
import { toast } from "sonner";
import { useAuthStore } from "@/features/auth/store/authStore";
import { FileInfoPanel } from "@/features/files/FileInfoPanel";
import { useRequestDownload } from "@/features/files/hooks/useFiles";
import type { FileItemFragment } from "@/gql/graphql";
import { useRightPanelStore } from "@/shared/store/rightPanelStore";

function triggerBrowserDownload(url: string, fileName?: string) {
	const link = document.createElement("a");
	link.href = url;
	link.target = "_blank";
	link.rel = "noopener noreferrer";
	if (fileName) {
		link.download = fileName;
	}
	document.body.appendChild(link);
	link.click();
	document.body.removeChild(link);
}

export function useFileActions() {
	const [, requestDownload] = useRequestDownload();
	const token = useAuthStore((state) => state.token);
	const setRightPanelContent = useRightPanelStore((state) => state.setContent);

	const showDetails = (file: FileItemFragment) => {
		setRightPanelContent(<FileInfoPanel fileId={file.id} />);
	};

	const downloadFile = async (file: FileItemFragment) => {
		try {
			const result = await requestDownload({ id: file.id });
			if (result.error) {
				throw new Error(result.error.message);
			}

			const response = result.data?.requestDownload;
			if (!response?.downloadUrl) {
				throw new Error("Download URL was not returned.");
			}

			if (response.useDirectDownload) {
				triggerBrowserDownload(response.downloadUrl, file.name);
				return;
			}

			if (!token) {
				throw new Error("You must be logged in to download this file.");
			}

			const proxyResponse = await axios.get<Blob>(response.downloadUrl, {
				responseType: "blob",
				headers: {
					Authorization: `Bearer ${token}`,
				},
			});

			const blobUrl = URL.createObjectURL(proxyResponse.data);
			try {
				triggerBrowserDownload(blobUrl, file.name);
			} finally {
				URL.revokeObjectURL(blobUrl);
			}
		} catch (error) {
			const message =
				error instanceof Error ? error.message : "Failed to download file.";
			toast.error(message);
		}
	};

	return {
		showDetails,
		downloadFile,
	};
}
