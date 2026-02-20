import { useMutation, useQuery } from "urql";
import {
	CHANGE_VAULT_PASSPHRASE_MUTATION,
	CREATE_VAULT_FOLDER_MUTATION,
	DELETE_VAULT_FILE_MUTATION,
	INITIATE_VAULT_CHUNKED_UPLOAD_MUTATION,
	MY_VAULT_QUERY,
	RENAME_VAULT_FILE_MUTATION,
	REQUEST_VAULT_DOWNLOAD_MUTATION,
	REQUEST_VAULT_UPLOAD_MUTATION,
	SETUP_VAULT_MUTATION,
	STAR_VAULT_FILE_MUTATION,
	UNSTAR_VAULT_FILE_MUTATION,
	VAULT_CONTENTS_QUERY,
} from "@/features/vault/api/vault";

export function useMyVault() {
	return useQuery({
		query: MY_VAULT_QUERY,
		requestPolicy: "cache-and-network",
	});
}

export function useVaultContents(path: string) {
	return useQuery({
		query: VAULT_CONTENTS_QUERY,
		variables: { path },
		requestPolicy: "cache-and-network",
	});
}

export function useSetupVault() {
	return useMutation(SETUP_VAULT_MUTATION);
}

export function useChangeVaultPassphrase() {
	return useMutation(CHANGE_VAULT_PASSPHRASE_MUTATION);
}

export function useRequestVaultUpload() {
	return useMutation(REQUEST_VAULT_UPLOAD_MUTATION);
}

export function useRequestVaultDownload() {
	return useMutation(REQUEST_VAULT_DOWNLOAD_MUTATION);
}

export function useCreateVaultFolder() {
	return useMutation(CREATE_VAULT_FOLDER_MUTATION);
}

export function useDeleteVaultFile() {
	return useMutation(DELETE_VAULT_FILE_MUTATION);
}

export function useRenameVaultFile() {
	return useMutation(RENAME_VAULT_FILE_MUTATION);
}

export function useStarVaultFile() {
	return useMutation(STAR_VAULT_FILE_MUTATION);
}

export function useUnstarVaultFile() {
	return useMutation(UNSTAR_VAULT_FILE_MUTATION);
}

export function useInitiateVaultChunkedUpload() {
	return useMutation(INITIATE_VAULT_CHUNKED_UPLOAD_MUTATION);
}
