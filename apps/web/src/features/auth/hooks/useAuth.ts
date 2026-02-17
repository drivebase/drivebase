import { useCallback, useEffect } from "react";
import { useMutation, useQuery } from "urql";
import {
	CHANGE_PASSWORD_MUTATION,
	LOGIN_MUTATION,
	LOGOUT_MUTATION,
	ME_QUERY,
	REGISTER_MUTATION,
	UPDATE_MY_PROFILE_MUTATION,
} from "@/features/auth/api/auth";
import { useAuthStore } from "@/features/auth/store/authStore";
import { useFragment as getFragmentData } from "@/gql/fragment-masking";
import type { LoginInput, RegisterInput } from "@/gql/graphql";
import { UserFragment } from "@/shared/api/fragments";

export function useMe() {
	const [result, reexecuteQuery] = useQuery({
		query: ME_QUERY,
		// Pause if not authenticated to avoid unnecessary calls
		pause: !useAuthStore.getState().isAuthenticated,
	});

	const { setUser, logout } = useAuthStore();

	useEffect(() => {
		if (result.data?.me) {
			const user = getFragmentData(UserFragment, result.data.me);
			setUser(user);
		}
	}, [result.data, setUser]);

	useEffect(() => {
		// If /me returns GraphQL errors (but transport is healthy), token/session is invalid.
		if (result.error && !result.error.networkError) {
			logout();
		}
	}, [result.error, logout]);

	return [result, reexecuteQuery] as const;
}

export function useLogin() {
	const [result, loginMutation] = useMutation(LOGIN_MUTATION);
	const { setAuth } = useAuthStore();

	const login = useCallback(
		async (variables: { input: LoginInput }) => {
			const response = await loginMutation(variables);
			if (response.data?.login) {
				const { token, user: userFragment } = response.data.login;
				const user = getFragmentData(UserFragment, userFragment);
				setAuth(user, token);
			}
			return response;
		},
		[loginMutation, setAuth],
	);

	return [result, login] as const;
}

export function useRegister() {
	const [result, registerMutation] = useMutation(REGISTER_MUTATION);
	const { setAuth } = useAuthStore();

	const register = useCallback(
		async (variables: { input: RegisterInput }) => {
			const response = await registerMutation(variables);
			if (response.data?.register) {
				const { token, user: userFragment } = response.data.register;
				const user = getFragmentData(UserFragment, userFragment);
				setAuth(user, token);
			}
			return response;
		},
		[registerMutation, setAuth],
	);

	return [result, register] as const;
}

export function useLogout() {
	const [result, logoutMutation] = useMutation(LOGOUT_MUTATION);
	const { logout: clearStore } = useAuthStore();

	const logout = useCallback(async () => {
		const response = await logoutMutation({});
		if (response.data?.logout) {
			clearStore();
		}
		return response;
	}, [logoutMutation, clearStore]);

	return [result, logout] as const;
}

export function useUpdateMyProfile() {
	const [result, mutate] = useMutation(UPDATE_MY_PROFILE_MUTATION);
	const { setUser } = useAuthStore();

	const updateMyProfile = useCallback(
		async (variables: { input: { name: string } }) => {
			const response = await mutate(variables);
			if (response.data?.updateMyProfile) {
				const user = getFragmentData(
					UserFragment,
					response.data.updateMyProfile,
				);
				setUser(user);
			}
			return response;
		},
		[mutate, setUser],
	);

	return [result, updateMyProfile] as const;
}

export function useChangePassword() {
	const [result, mutate] = useMutation(CHANGE_PASSWORD_MUTATION);

	const changePassword = useCallback(
		async (variables: {
			input: { currentPassword: string; newPassword: string };
		}) => mutate(variables),
		[mutate],
	);

	return [result, changePassword] as const;
}
