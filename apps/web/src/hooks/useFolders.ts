import { useQuery, useMutation } from "urql";
import {
	FOLDER_QUERY,
	FOLDERS_QUERY,
	STARRED_FOLDERS_QUERY,
	CREATE_FOLDER_MUTATION,
	RENAME_FOLDER_MUTATION,
	MOVE_FOLDER_MUTATION,
	DELETE_FOLDER_MUTATION,
	STAR_FOLDER_MUTATION,
	UNSTAR_FOLDER_MUTATION,
} from "@/api/folder";

export function useFolder(id: string) {
	const [result] = useQuery({
		query: FOLDER_QUERY,
		variables: { id },
		pause: !id,
	});
	return result;
}

export function useFolders(parentId?: string | null, path?: string) {
	const [result] = useQuery({
		query: FOLDERS_QUERY,
		variables: { parentId, path },
	});
	return result;
}

export function useStarredFolders() {
	const [result] = useQuery({
		query: STARRED_FOLDERS_QUERY,
	});
	return result;
}

export function useCreateFolder() {
	const [result, execute] = useMutation(CREATE_FOLDER_MUTATION);
	return [result, execute] as const;
}

export function useRenameFolder() {
	const [result, execute] = useMutation(RENAME_FOLDER_MUTATION);
	return [result, execute] as const;
}

export function useMoveFolder() {
	const [result, execute] = useMutation(MOVE_FOLDER_MUTATION);
	return [result, execute] as const;
}

export function useDeleteFolder() {
	const [result, execute] = useMutation(DELETE_FOLDER_MUTATION);
	return [result, execute] as const;
}

export function useStarFolder() {
	const [result, execute] = useMutation(STAR_FOLDER_MUTATION);
	return [result, execute] as const;
}

export function useUnstarFolder() {
	const [result, execute] = useMutation(UNSTAR_FOLDER_MUTATION);
	return [result, execute] as const;
}
