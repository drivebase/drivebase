import { useMutation, useQuery } from "urql";
import {
	CONNECT_PROVIDER_MUTATION,
	DISCONNECT_PROVIDER_MUTATION,
	INITIATE_PROVIDER_OAUTH_MUTATION,
	PROVIDER_QUERY,
	PROVIDERS_QUERY,
	SYNC_PROVIDER_MUTATION,
	UPDATE_PROVIDER_QUOTA_MUTATION,
} from "@/api/provider";

export function useProviders() {
	const [result] = useQuery({
		query: PROVIDERS_QUERY,
	});
	return result;
}

export function useProvider(id: string) {
	const [result] = useQuery({
		query: PROVIDER_QUERY,
		variables: { id },
	});
	return result;
}

export function useConnectProvider() {
	const [result, execute] = useMutation(CONNECT_PROVIDER_MUTATION);
	return [result, execute] as const;
}

export function useDisconnectProvider() {
	const [result, execute] = useMutation(DISCONNECT_PROVIDER_MUTATION);
	return [result, execute] as const;
}

export function useSyncProvider() {
	const [result, execute] = useMutation(SYNC_PROVIDER_MUTATION);
	return [result, execute] as const;
}

export function useInitiateProviderOAuth() {
	const [result, execute] = useMutation(INITIATE_PROVIDER_OAUTH_MUTATION);
	return [result, execute] as const;
}

export function useUpdateProviderQuota() {
	const [result, execute] = useMutation(UPDATE_PROVIDER_QUOTA_MUTATION);
	return [result, execute] as const;
}
