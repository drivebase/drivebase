import { create } from "zustand";
import { persist } from "zustand/middleware";

export type Theme = "light" | "dark" | "system";

interface ThemeState {
	theme: Theme;
	setTheme: (theme: Theme) => void;
}

function applyTheme(theme: Theme) {
	const isDark =
		theme === "dark" ||
		(theme === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches);
	document.documentElement.classList.toggle("dark", isDark);
}

export const useThemeStore = create<ThemeState>()(
	persist(
		(set) => ({
			theme: "system",
			setTheme: (theme) => {
				applyTheme(theme);
				set({ theme });
			},
		}),
		{
			name: "theme",
			onRehydrateStorage: () => (state) => {
				if (state) applyTheme(state.theme);
			},
		},
	),
);
