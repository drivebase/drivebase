import { useClient, useMutation, useQuery } from "urql";
import {
	ARCHIVE_FILE_MUTATION,
	CONTENTS_QUERY,
	CREATE_FILE_DOWNLOAD_LINK_MUTATION,
	DELETE_FILE_MUTATION,
	FILE_DOWNLOAD_LINKS_QUERY,
	FILE_QUERY,
	FILES_QUERY,
	MOVE_FILE_MUTATION,
	MOVE_FILE_TO_PROVIDER_MUTATION,
	RECENT_FILES_QUERY,
	REFRESH_FILE_LIFECYCLE_MUTATION,
	RENAME_FILE_MUTATION,
	REQUEST_DOWNLOAD_MUTATION,
	REQUEST_FILE_RESTORE_MUTATION,
	REQUEST_UPLOAD_MUTATION,
	REVOKE_FILE_DOWNLOAD_LINK_MUTATION,
	SEARCH_FILES_AI_QUERY,
	SEARCH_FILES_QUERY,
	SEARCH_FOLDERS_QUERY,
	STAR_FILE_MUTATION,
	STARRED_FILES_QUERY,
	UNSTAR_FILE_MUTATION,
} from "@/features/files/api/file";
import { ACTIVE_JOBS_QUERY } from "@/shared/api/activity";
import { useActivityStore } from "@/shared/store/activityStore";

export function useFiles(folderId?: string | null, limit = 50, offset = 0) {
	const [result] = useQuery({
		query: FILES_QUERY,
		variables: { folderId, limit, offset },
	});
	return result;
}

export function useContents(folderId?: string | null, providerIds?: string[]) {
	const [result, reexecuteQuery] = useQuery({
		query: CONTENTS_QUERY,
		variables: {
			folderId: folderId ?? null,
			providerIds: providerIds?.length ? providerIds : null,
		},
		requestPolicy: "cache-and-network",
	});
	return [result, reexecuteQuery] as const;
}

export function useFile(id: string) {
	const [result] = useQuery({
		query: FILE_QUERY,
		variables: { id },
	});
	return result;
}

export function useSearchFiles(query: string, limit = 20) {
	const [result] = useQuery({
		query: SEARCH_FILES_QUERY,
		variables: { query, limit },
		pause: !query,
	});
	return result;
}

export function useSearchFilesAi(query: string, limit = 20) {
	const [result] = useQuery({
		query: SEARCH_FILES_AI_QUERY,
		variables: { query, limit },
		pause: !query,
	});
	return result;
}

export function useSearchFolders(query: string, limit = 20) {
	const [result] = useQuery({
		query: SEARCH_FOLDERS_QUERY,
		variables: { query, limit },
		pause: !query,
	});
	return result;
}

export function useRecentFiles(limit = 3) {
	const [result] = useQuery({
		query: RECENT_FILES_QUERY,
		variables: { limit },
		requestPolicy: "cache-and-network",
	});
	return result;
}

export function useStarredFiles() {
	const [result] = useQuery({
		query: STARRED_FILES_QUERY,
		requestPolicy: "cache-and-network",
	});
	return result;
}

export function useFileDownloadLinks(fileId: string, pause: boolean) {
	const [result, reexecuteQuery] = useQuery({
		query: FILE_DOWNLOAD_LINKS_QUERY,
		variables: { fileId },
		pause,
		requestPolicy: "cache-and-network",
	});
	return [result, reexecuteQuery] as const;
}

export function useRequestUpload() {
	const [result, execute] = useMutation(REQUEST_UPLOAD_MUTATION);
	return [result, execute] as const;
}

export function useRequestDownload() {
	const [result, execute] = useMutation(REQUEST_DOWNLOAD_MUTATION);
	return [result, execute] as const;
}

export function useCreateFileDownloadLink() {
	const [result, execute] = useMutation(CREATE_FILE_DOWNLOAD_LINK_MUTATION);
	return [result, execute] as const;
}

export function useRevokeFileDownloadLink() {
	const [result, execute] = useMutation(REVOKE_FILE_DOWNLOAD_LINK_MUTATION);
	return [result, execute] as const;
}

export function useRenameFile() {
	const [result, execute] = useMutation(RENAME_FILE_MUTATION);
	return [result, execute] as const;
}

export function useMoveFile() {
	const [result, execute] = useMutation(MOVE_FILE_MUTATION);
	return [result, execute] as const;
}

export function useMoveFileToProvider() {
	const client = useClient();
	const setJob = useActivityStore((state) => state.setJob);
	const [result, execute] = useMutation(MOVE_FILE_TO_PROVIDER_MUTATION);
	const executeWithActivityRefresh = async (
		variables: Parameters<typeof execute>[0],
	) => {
		const mutationResult = await execute(variables);
		if (!mutationResult.error) {
			const activeJobsResult = await client
				.query(
					ACTIVE_JOBS_QUERY,
					{},
					{
						requestPolicy: "network-only",
					},
				)
				.toPromise();
			for (const job of activeJobsResult.data?.activeJobs ?? []) {
				setJob(job);
			}
		}
		return mutationResult;
	};
	return [result, executeWithActivityRefresh] as const;
}

export function useDeleteFile() {
	const [result, execute] = useMutation(DELETE_FILE_MUTATION);
	return [result, execute] as const;
}

export function useArchiveFile() {
	const client = useClient();
	const setJob = useActivityStore((state) => state.setJob);
	const [result, execute] = useMutation(ARCHIVE_FILE_MUTATION);
	const executeWithActivityRefresh = async (
		variables: Parameters<typeof execute>[0],
	) => {
		const mutationResult = await execute(variables);
		if (mutationResult.data?.archiveFile) {
			setJob(mutationResult.data.archiveFile);
			const activeJobsResult = await client
				.query(ACTIVE_JOBS_QUERY, {}, { requestPolicy: "network-only" })
				.toPromise();
			for (const job of activeJobsResult.data?.activeJobs ?? []) {
				setJob(job);
			}
		}
		return mutationResult;
	};
	return [result, executeWithActivityRefresh] as const;
}

export function useRequestFileRestore() {
	const client = useClient();
	const setJob = useActivityStore((state) => state.setJob);
	const [result, execute] = useMutation(REQUEST_FILE_RESTORE_MUTATION);
	const executeWithActivityRefresh = async (
		variables: Parameters<typeof execute>[0],
	) => {
		const mutationResult = await execute(variables);
		if (mutationResult.data?.requestFileRestore) {
			setJob(mutationResult.data.requestFileRestore);
			const activeJobsResult = await client
				.query(ACTIVE_JOBS_QUERY, {}, { requestPolicy: "network-only" })
				.toPromise();
			for (const job of activeJobsResult.data?.activeJobs ?? []) {
				setJob(job);
			}
		}
		return mutationResult;
	};
	return [result, executeWithActivityRefresh] as const;
}

export function useRefreshFileLifecycle() {
	const [result, execute] = useMutation(REFRESH_FILE_LIFECYCLE_MUTATION);
	return [result, execute] as const;
}

export function useStarFile() {
	const [result, execute] = useMutation(STAR_FILE_MUTATION);
	return [result, execute] as const;
}

export function useUnstarFile() {
	const [result, execute] = useMutation(UNSTAR_FILE_MUTATION);
	return [result, execute] as const;
}
