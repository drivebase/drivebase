import { authExchange } from "@urql/exchange-auth";
import { createClient as createSSEClient } from "graphql-sse";
import {
	cacheExchange,
	createClient,
	fetchExchange,
	subscriptionExchange,
} from "urql";
import { useAuthStore } from "@/store/auth";
import { useWorkspaceStore } from "@/store/workspace";

const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:8080/graphql";

const sseClient = createSSEClient({ url: API_URL });

const RefreshTokenMutation = `
  mutation RefreshToken($token: String!) {
    refreshToken(token: $token) {
      accessToken
      refreshToken
      user { id email name }
    }
  }
`;

const SwitchWorkspaceMutation = `
  mutation SwitchWorkspace($workspaceID: UUID!) {
    switchWorkspace(workspaceID: $workspaceID) {
      accessToken
    }
  }
`;

export const gqlClient = createClient({
	url: API_URL,
	exchanges: [
		cacheExchange,
		authExchange(async (utils) => ({
			addAuthToOperation(operation) {
				const { token } = useAuthStore.getState();
				if (!token) return operation;
				return utils.appendHeaders(operation, {
					Authorization: `Bearer ${token}`,
				});
			},
			willAuthError() {
				return !useAuthStore.getState().token;
			},
			didAuthError(error) {
				return error.graphQLErrors.some(
					(e) => e.extensions?.code === "UNAUTHENTICATED",
				);
			},
			async refreshAuth() {
				const { refreshToken, clearAuth, setAuth } = useAuthStore.getState();
				if (!refreshToken) {
					clearAuth();
					return;
				}

				const result = await utils.mutate(RefreshTokenMutation, {
					token: refreshToken,
				});

				if (result.data?.refreshToken) {
					const { accessToken, refreshToken: newRefresh, user } =
						result.data.refreshToken;
					setAuth(accessToken, newRefresh, user);

					// Re-scope the token to the current workspace if one is selected
					const workspace = useWorkspaceStore.getState().workspace;
					if (workspace) {
						const scoped = await utils.mutate(SwitchWorkspaceMutation, {
							workspaceID: workspace.id,
						});
						if (scoped.data?.switchWorkspace?.accessToken) {
							useAuthStore.getState().setToken(scoped.data.switchWorkspace.accessToken);
						}
					}
				} else {
					clearAuth();
				}
			},
		})),
		fetchExchange,
		subscriptionExchange({
			forwardSubscription: (req) => ({
				subscribe: (sink) => ({
					unsubscribe: sseClient.subscribe(
						req as Parameters<typeof sseClient.subscribe>[0],
						sink,
					),
				}),
			}),
		}),
	],
});
