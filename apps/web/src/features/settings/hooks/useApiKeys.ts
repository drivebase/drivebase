import { useMutation, useQuery } from "urql";
import {
	API_KEYS_QUERY,
	CREATE_API_KEY_MUTATION,
	REVOKE_API_KEY_MUTATION,
	UPDATE_API_KEY_MUTATION,
} from "../api/api-keys";

export function useApiKeys() {
	return useQuery({
		query: API_KEYS_QUERY,
		requestPolicy: "cache-and-network",
	});
}

export function useCreateApiKey() {
	return useMutation(CREATE_API_KEY_MUTATION);
}

export function useUpdateApiKey() {
	return useMutation(UPDATE_API_KEY_MUTATION);
}

export function useRevokeApiKey() {
	return useMutation(REVOKE_API_KEY_MUTATION);
}
