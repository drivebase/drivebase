import { I18nProvider as LinguiProvider } from "@lingui/react";
import { type ReactNode, useEffect, useState } from "react";
import { i18n, initI18n, isRTL } from "@/lib/i18n";
import { useLocaleStore } from "@/shared/store/localeStore";

interface I18nProviderProps {
	children: ReactNode;
}

export function I18nProvider({ children }: I18nProviderProps) {
	const [isLoaded, setIsLoaded] = useState(false);
	const locale = useLocaleStore((state) => state.locale);

	useEffect(() => {
		initI18n().then(() => {
			setIsLoaded(true);
		});
	}, []);

	// Update document direction when locale changes
	useEffect(() => {
		if (isLoaded) {
			const dir = isRTL(locale) ? "rtl" : "ltr";
			document.documentElement.setAttribute("dir", dir);
			document.documentElement.setAttribute("lang", locale);
		}
	}, [locale, isLoaded]);

	// Wait for i18n to initialize before rendering children
	if (!isLoaded) {
		return null;
	}

	return <LinguiProvider i18n={i18n}>{children}</LinguiProvider>;
}
