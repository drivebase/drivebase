import { i18n } from "@lingui/core";

export const locales = {
	en: "English",
	es: "Español",
};

export const defaultLocale = "en";

/**
 * Load locale messages dynamically
 */
export async function loadLocale(locale: string) {
	const { messages } = await import(`../locales/${locale}/messages.ts`);
	i18n.load(locale, messages);
	i18n.activate(locale);
}

/**
 * Detect the user's locale from browser settings
 * Falls back to defaultLocale if not supported
 */
export function detectLocale(): string {
	// Check localStorage first
	const stored = localStorage.getItem("locale");
	if (stored && Object.keys(locales).includes(stored)) {
		return stored;
	}

	// Check browser language
	const browserLang = navigator.language.split("-")[0];
	if (Object.keys(locales).includes(browserLang)) {
		return browserLang;
	}

	return defaultLocale;
}

/**
 * Initialize i18n with detected locale
 */
export async function initI18n() {
	const locale = detectLocale();
	await loadLocale(locale);
	return i18n;
}

export { i18n };
