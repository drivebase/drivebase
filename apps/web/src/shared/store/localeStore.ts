import { create } from "zustand";
import { loadLocale } from "@/lib/i18n";

interface LocaleState {
	locale: string;
	setLocale: (locale: string) => Promise<void>;
}

export const useLocaleStore = create<LocaleState>((set) => ({
	locale: localStorage.getItem("locale") || "en",
	setLocale: async (locale: string) => {
		await loadLocale(locale);
		localStorage.setItem("locale", locale);
		set({ locale });
	},
}));
