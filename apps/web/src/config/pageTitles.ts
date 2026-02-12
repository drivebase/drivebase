export const pageTitles: Record<string, string> = {
	"/": "Dashboard",
	"/files": "All Files",
	"/favorites": "Favorites",
	"/providers": "Providers",
	"/trash": "Trash",
	"/settings": "Settings",
	"/my-account": "My Account",
};

export const getPageTitle = (pathname: string): string => {
	// Handle exact matches first
	if (pageTitles[pathname]) {
		return pageTitles[pathname];
	}

	// Handle nested routes (e.g., /files/folder/123 -> Files)
	const sortedKeys = Object.keys(pageTitles).sort(
		(a, b) => b.length - a.length,
	);
	for (const key of sortedKeys) {
		if (key !== "/" && pathname.startsWith(key)) {
			return pageTitles[key];
		}
	}

	return "Dashboard";
};
