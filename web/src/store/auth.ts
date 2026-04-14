import { create } from "zustand";
import { persist } from "zustand/middleware";

interface User {
	id: string;
	email: string;
	name: string;
}

interface AuthState {
	token: string | null;
	refreshToken: string | null;
	user: User | null;
	setAuth: (token: string, refreshToken: string, user: User) => void;
	clearAuth: () => void;
}

export const useAuthStore = create<AuthState>()(
	persist(
		(set) => ({
			token: null,
			refreshToken: null,
			user: null,
			setAuth: (token, refreshToken, user) =>
				set({ token, refreshToken, user }),
			clearAuth: () => set({ token: null, refreshToken: null, user: null }),
		}),
		{
			name: "auth",
		},
	),
);
