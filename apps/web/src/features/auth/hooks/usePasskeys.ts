import {
	startAuthentication,
	startRegistration,
} from "@simplewebauthn/browser";
import { useCallback } from "react";
import { useMutation, useQuery } from "urql";
import {
	DELETE_PASSKEY_MUTATION,
	MY_PASSKEYS_QUERY,
	START_PASSKEY_LOGIN_MUTATION,
	START_PASSKEY_REGISTRATION_MUTATION,
	VERIFY_PASSKEY_LOGIN_MUTATION,
	VERIFY_PASSKEY_REGISTRATION_MUTATION,
} from "@/features/auth/api/auth";
import { useAuthStore } from "@/features/auth/store/authStore";
import { useFragment as getFragmentData } from "@/gql/fragment-masking";
import { UserFragment } from "@/shared/api/fragments";

export function useMyPasskeys() {
	return useQuery({ query: MY_PASSKEYS_QUERY });
}

export function useAddPasskey() {
	const [startResult, startMutation] = useMutation(
		START_PASSKEY_REGISTRATION_MUTATION,
	);
	const [, verifyMutation] = useMutation(VERIFY_PASSKEY_REGISTRATION_MUTATION);

	const addPasskey = useCallback(
		async (name: string) => {
			const startResponse = await startMutation({});
			if (
				startResponse.error ||
				!startResponse.data?.startPasskeyRegistration
			) {
				throw new Error(
					startResponse.error?.message ??
						"Failed to start passkey registration",
				);
			}

			const options = JSON.parse(
				startResponse.data.startPasskeyRegistration,
			) as Parameters<typeof startRegistration>[0]["optionsJSON"];

			const registrationResponse = await startRegistration({
				optionsJSON: options,
			});

			return verifyMutation({
				name,
				response: JSON.stringify(registrationResponse),
			});
		},
		[startMutation, verifyMutation],
	);

	return [startResult, addPasskey] as const;
}

export function usePasskeyLogin() {
	const { setAuth } = useAuthStore();
	const [startResult, startMutation] = useMutation(
		START_PASSKEY_LOGIN_MUTATION,
	);
	const [, verifyMutation] = useMutation(VERIFY_PASSKEY_LOGIN_MUTATION);

	const passkeyLogin = useCallback(async () => {
		const startResponse = await startMutation({});
		if (startResponse.error || !startResponse.data?.startPasskeyLogin) {
			throw new Error(
				startResponse.error?.message ?? "Failed to start passkey login",
			);
		}

		const { optionsJson, challengeId } = JSON.parse(
			startResponse.data.startPasskeyLogin,
		) as { optionsJson: string; challengeId: string };

		const options = JSON.parse(optionsJson) as Parameters<
			typeof startAuthentication
		>[0]["optionsJSON"];

		const authResponse = await startAuthentication({ optionsJSON: options });

		const verifyResponse = await verifyMutation({
			challengeId,
			response: JSON.stringify(authResponse),
		});

		if (verifyResponse.data?.verifyPasskeyLogin) {
			const { token, user: userFragment } =
				verifyResponse.data.verifyPasskeyLogin;
			const user = getFragmentData(UserFragment, userFragment);
			setAuth(user, token);
		}

		return verifyResponse;
	}, [startMutation, verifyMutation, setAuth]);

	return [startResult, passkeyLogin] as const;
}

export function useDeletePasskey() {
	const [result, mutate] = useMutation(DELETE_PASSKEY_MUTATION);

	const deletePasskey = useCallback((id: string) => mutate({ id }), [mutate]);

	return [result, deletePasskey] as const;
}
