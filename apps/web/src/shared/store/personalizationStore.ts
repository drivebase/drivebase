import { useEffect } from "react";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

export type AppearancePresetId =
	| "none"
	| "amethyst"
	| "ocean"
	| "sunset"
	| "emerald";

export type AppearancePreset = {
	id: AppearancePresetId;
	colors: [string, string, string];
	backgroundImage: string;
};

export const appearancePresets: Record<AppearancePresetId, AppearancePreset> = {
	none: {
		id: "none",
		colors: ["#d4d4d8", "#a1a1aa", "#71717a"],
		backgroundImage: "none",
	},
	amethyst: {
		id: "amethyst",
		colors: ["#a855f7", "#c084fc", "#9333ea"],
		backgroundImage: `
      radial-gradient(600px circle at 20% 20%, rgba(168,85,247,0.25), transparent 60%),
      radial-gradient(500px circle at 80% 30%, rgba(192,132,252,0.20), transparent 60%),
      radial-gradient(700px circle at 50% 90%, rgba(147,51,234,0.20), transparent 70%)
    `,
	},
	ocean: {
		id: "ocean",
		colors: ["#0ea5e9", "#38bdf8", "#14b8a6"],
		backgroundImage: `
      radial-gradient(600px circle at 18% 24%, rgba(14,165,233,0.24), transparent 58%),
      radial-gradient(520px circle at 82% 24%, rgba(56,189,248,0.18), transparent 62%),
      radial-gradient(720px circle at 52% 88%, rgba(20,184,166,0.20), transparent 72%)
    `,
	},
	sunset: {
		id: "sunset",
		colors: ["#f97316", "#fb7185", "#f59e0b"],
		backgroundImage: `
      radial-gradient(620px circle at 16% 18%, rgba(249,115,22,0.24), transparent 58%),
      radial-gradient(520px circle at 82% 28%, rgba(251,113,133,0.20), transparent 60%),
      radial-gradient(760px circle at 50% 92%, rgba(245,158,11,0.18), transparent 72%)
    `,
	},
	emerald: {
		id: "emerald",
		colors: ["#22c55e", "#10b981", "#84cc16"],
		backgroundImage: `
      radial-gradient(610px circle at 22% 18%, rgba(34,197,94,0.22), transparent 58%),
      radial-gradient(520px circle at 78% 30%, rgba(16,185,129,0.18), transparent 60%),
      radial-gradient(740px circle at 48% 90%, rgba(132,204,22,0.18), transparent 72%)
    `,
	},
};

type PersonalizationState = {
	appearanceId: AppearancePresetId;
	setAppearanceId: (appearanceId: AppearancePresetId) => void;
};

export const usePersonalizationStore = create<PersonalizationState>()(
	persist(
		(set) => ({
			appearanceId: "none",
			setAppearanceId: (appearanceId) => set({ appearanceId }),
		}),
		{
			name: "drivebase-personalization",
			storage: createJSONStorage(() => localStorage),
		},
	),
);

export function useApplyAppearance() {
	const appearanceId = usePersonalizationStore((state) => state.appearanceId);

	useEffect(() => {
		const root = window.document.documentElement;
		const preset = appearancePresets[appearanceId];
		root.style.setProperty("--app-background-image", preset.backgroundImage);
		root.dataset.appearance = appearanceId;
	}, [appearanceId]);
}
