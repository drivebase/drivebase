import { create } from "zustand";
import type { User } from "@/gql/graphql";

interface AuthState {
	user: User | null;
	token: string | null;
	workspaceId: string | null;
	workspaceRole: string | null;
	isAuthenticated: boolean;
	setAuth: (
		user: User,
		token: string,
		workspaceId: string,
		workspaceRole: string,
	) => void;
	setUser: (user: User) => void;
	logout: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
	user: null,
	token: localStorage.getItem("token"),
	workspaceId: localStorage.getItem("workspaceId"),
	workspaceRole: localStorage.getItem("workspaceRole"),
	isAuthenticated: !!localStorage.getItem("token"),
	setAuth: (user, token, workspaceId, workspaceRole) => {
		localStorage.setItem("token", token);
		localStorage.setItem("workspaceId", workspaceId);
		localStorage.setItem("workspaceRole", workspaceRole);
		set({ user, token, workspaceId, workspaceRole, isAuthenticated: true });
	},
	setUser: (user) => {
		set({ user });
	},
	logout: () => {
		localStorage.removeItem("token");
		localStorage.removeItem("workspaceId");
		localStorage.removeItem("workspaceRole");
		set({
			user: null,
			token: null,
			workspaceId: null,
			workspaceRole: null,
			isAuthenticated: false,
		});
	},
}));
