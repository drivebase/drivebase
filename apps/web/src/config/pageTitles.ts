import type { I18n, MessageDescriptor } from "@lingui/core";
import { msg } from "@lingui/macro";

export const pageTitles: Record<string, MessageDescriptor> = {
	"/": msg`Dashboard`,
	"/files": msg`All Files`,
	"/favorites": msg`Favorites`,
	"/providers": msg`Providers`,
	"/trash": msg`Trash`,
	"/settings": msg`Settings`,
	"/vault": msg`Vault`,
	"/my-account": msg`My Account`,
};

export const getPageTitle = (pathname: string, i18n: I18n): string => {
	// Handle exact matches first
	if (pageTitles[pathname]) {
		return i18n._(pageTitles[pathname]);
	}

	// Handle nested routes (e.g., /files/folder/123 -> Files)
	const sortedKeys = Object.keys(pageTitles).sort(
		(a, b) => b.length - a.length,
	);
	for (const key of sortedKeys) {
		if (key !== "/" && pathname.startsWith(key)) {
			return i18n._(pageTitles[key]);
		}
	}

	return i18n._(msg`Dashboard`);
};
