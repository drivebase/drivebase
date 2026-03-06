import { useMutation, useQuery } from "urql";
import {
	CREATE_WEBDAV_CREDENTIAL_MUTATION,
	REVOKE_WEBDAV_CREDENTIAL_MUTATION,
	WEBDAV_CREDENTIALS_QUERY,
} from "../api/webdav";

export function useWebDavCredentials(pause = false) {
	return useQuery({
		query: WEBDAV_CREDENTIALS_QUERY,
		pause,
		requestPolicy: "cache-and-network",
	});
}

export function useCreateWebDavCredential() {
	return useMutation(CREATE_WEBDAV_CREDENTIAL_MUTATION);
}

export function useRevokeWebDavCredential() {
	return useMutation(REVOKE_WEBDAV_CREDENTIAL_MUTATION);
}
