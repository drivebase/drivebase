import { create } from "zustand";
import { clearActiveWorkspaceId } from "@/features/workspaces/lib/workspace";
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
		clearActiveWorkspaceId();
		set({ user: null, token: null, isAuthenticated: false });
	},
}));
