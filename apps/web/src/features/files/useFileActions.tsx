import { t } from "@lingui/core/macro";
import { useCallback } from "react";
import { FileInfoPanel } from "@/features/files/FileInfoPanel";
import { useDownload } from "@/features/files/hooks/useDownload";
import { useCreateFileDownloadLink } from "@/features/files/hooks/useFiles";
import type { FileItemFragment } from "@/gql/graphql";
import { downloadLinkConfigDialog } from "@/shared/lib/downloadLinkConfigDialog";
import { useRightPanelStore } from "@/shared/store/rightPanelStore";

export function useFileActions() {
	const { downloadFile } = useDownload();
	const [, createFileDownloadLink] = useCreateFileDownloadLink();
	const setRightPanelContent = useRightPanelStore((state) => state.setContent);

	const showDetails = (file: FileItemFragment) => {
		setRightPanelContent(<FileInfoPanel fileId={file.id} />);
	};

	const createDownloadLink = useCallback(
		async (file: FileItemFragment) => {
			await downloadLinkConfigDialog(
				t`Create download link`,
				t`Set download limit and expiry for this file.`,
				{
					defaultMaxDownloads: 10,
					defaultExpiresInDays: 7,
					maxExpiresInDays: 30,
					onCreate: async (downloadLinkConfig) => {
						const expiresAt = new Date(
							Date.now() +
								downloadLinkConfig.expiresInDays * 24 * 60 * 60 * 1000,
						).toISOString();

						const result = await createFileDownloadLink({
							input: {
								fileId: file.id,
								maxDownloads: downloadLinkConfig.maxDownloads,
								expiresAt,
							},
						});
						if (result.error || !result.data?.createFileDownloadLink) {
							throw new Error(
								(
									result.error?.message ?? t`Failed to create download link`
								).replace(/^\[GraphQL\]\s*/, ""),
							);
						}

						const link = result.data.createFileDownloadLink.downloadLinkUrl;
						if (!link) {
							throw new Error(t`Failed to create download link`);
						}

						return link;
					},
				},
			);
		},
		[createFileDownloadLink],
	);

	return { showDetails, downloadFile, createDownloadLink };
}
