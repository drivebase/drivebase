import { I18nProvider as LinguiProvider } from "@lingui/react";
import { type ReactNode, useEffect, useState } from "react";
import { i18n, initI18n } from "@/lib/i18n";

interface I18nProviderProps {
	children: ReactNode;
}

export function I18nProvider({ children }: I18nProviderProps) {
	const [isLoaded, setIsLoaded] = useState(false);

	useEffect(() => {
		initI18n().then(() => {
			setIsLoaded(true);
		});
	}, []);

	// Wait for i18n to initialize before rendering children
	if (!isLoaded) {
		return null;
	}

	return <LinguiProvider i18n={i18n}>{children}</LinguiProvider>;
}
