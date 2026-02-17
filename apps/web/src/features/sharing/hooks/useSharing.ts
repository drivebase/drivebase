import { useMutation, useQuery } from "urql";
import {
	GET_FOLDER_PERMISSIONS_QUERY,
	SHARED_WITH_ME_QUERY,
} from "@/features/sharing/api/permission";
import {
	GRANT_FOLDER_ACCESS_MUTATION,
	REVOKE_FOLDER_ACCESS_MUTATION,
} from "@/shared/api/permission";

export function useSharedWithMe() {
	const [result] = useQuery({
		query: SHARED_WITH_ME_QUERY,
		requestPolicy: "cache-and-network",
	});
	return result;
}

export function useFolderPermissions(folderId: string) {
	const [result] = useQuery({
		query: GET_FOLDER_PERMISSIONS_QUERY,
		variables: { id: folderId },
		pause: !folderId,
	});
	return result;
}

export function useGrantFolderAccess() {
	const [result, execute] = useMutation(GRANT_FOLDER_ACCESS_MUTATION);
	return [result, execute] as const;
}

export function useRevokeFolderAccess() {
	const [result, execute] = useMutation(REVOKE_FOLDER_ACCESS_MUTATION);
	return [result, execute] as const;
}
