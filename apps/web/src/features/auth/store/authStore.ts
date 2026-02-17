import { create } from "zustand";
import { ACTIVE_WORKSPACE_STORAGE_KEY } from "@/features/workspaces/api/workspace";
import type { User } from "@/gql/graphql";

interface AuthState {
	user: User | null;
	token: string | null;
	isAuthenticated: boolean;
	setAuth: (user: User, token: string) => void;
	setUser: (user: User) => void;
	logout: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
	user: null,
	token: localStorage.getItem("token"),
	isAuthenticated: !!localStorage.getItem("token"),
	setAuth: (user, token) => {
		localStorage.setItem("token", token);
		set({ user, token, isAuthenticated: true });
	},
	setUser: (user) => {
		set({ user });
	},
	logout: () => {
		localStorage.removeItem("token");
		localStorage.removeItem(ACTIVE_WORKSPACE_STORAGE_KEY);
		set({ user: null, token: null, isAuthenticated: false });
	},
}));
