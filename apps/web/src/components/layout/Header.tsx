import { useLingui } from "@lingui/react";
import { useLocation } from "@tanstack/react-router";
import { getPageTitle } from "@/config/pageTitles";

export function Header() {
	const { i18n } = useLingui();
	const location = useLocation();

	const pageTitle = getPageTitle(location.pathname, i18n);

	return (
		<header className="flex items-center justify-between px-8 py-5 border-b">
			<h1 className="text-3xl font-bold text-foreground">{pageTitle}</h1>
			<div className="flex items-center gap-4 flex-1 max-w-sm ml-8"></div>
		</header>
	);
}
