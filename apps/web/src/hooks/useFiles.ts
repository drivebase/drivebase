import { useQuery, useMutation } from "urql";
import {
	FILES_QUERY,
	CONTENTS_QUERY,
	FILE_QUERY,
	SEARCH_FILES_QUERY,
	STARRED_FILES_QUERY,
	REQUEST_UPLOAD_MUTATION,
	REQUEST_DOWNLOAD_MUTATION,
	RENAME_FILE_MUTATION,
	MOVE_FILE_MUTATION,
	DELETE_FILE_MUTATION,
	STAR_FILE_MUTATION,
	UNSTAR_FILE_MUTATION,
} from "@/api/file";

export function useFiles(folderId?: string | null, limit = 50, offset = 0) {
	const [result] = useQuery({
		query: FILES_QUERY,
		variables: { folderId, limit, offset },
	});
	return result;
}

export function useContents(path?: string) {
	const [result, reexecuteQuery] = useQuery({
		query: CONTENTS_QUERY,
		variables: { path: path ?? "" },
		pause: !path,
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

export function useStarredFiles() {
	const [result] = useQuery({
		query: STARRED_FILES_QUERY,
	});
	return result;
}

export function useRequestUpload() {
	const [result, execute] = useMutation(REQUEST_UPLOAD_MUTATION);
	return [result, execute] as const;
}

export function useRequestDownload() {
	const [result, execute] = useMutation(REQUEST_DOWNLOAD_MUTATION);
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

export function useDeleteFile() {
	const [result, execute] = useMutation(DELETE_FILE_MUTATION);
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
