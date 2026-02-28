import { ACTIVE_WORKSPACE_STORAGE_KEY } from "@/features/workspaces/api/workspace";
import { API_BASE_URL } from "@/shared/lib/apiUrl";

export interface ExportOptions {
	includeProviders?: boolean;
	includeSecrets?: boolean;
	password?: string;
}

export async function exportWorkspace(options: ExportOptions): Promise<void> {
	const token = localStorage.getItem("token");
	const workspaceId = localStorage.getItem(ACTIVE_WORKSPACE_STORAGE_KEY);

	const params = new URLSearchParams();
	if (options.includeProviders) {
		params.append("includeProviders", "true");
	}
	if (options.includeSecrets) {
		params.append("includeSecrets", "true");
	}
	if (options.password) {
		params.append("password", options.password);
	}

	const response = await fetch(
		`${API_BASE_URL}/api/export?${params.toString()}`,
		{
			method: "GET",
			headers: {
				Authorization: token ? `Bearer ${token}` : "",
				"x-workspace-id": workspaceId || "",
			},
		},
	);

	if (!response.ok) {
		const error = await response.text();
		throw new Error(error || "Failed to export workspace");
	}

	// Generate filename with local timezone timestamp
	const now = new Date();
	const year = now.getFullYear();
	const month = String(now.getMonth() + 1).padStart(2, "0");
	const day = String(now.getDate()).padStart(2, "0");
	const hours = String(now.getHours()).padStart(2, "0");
	const minutes = String(now.getMinutes()).padStart(2, "0");
	const seconds = String(now.getSeconds()).padStart(2, "0");
	const timestamp = `${year}-${month}-${day}T${hours}-${minutes}-${seconds}`;
	const filename = `Drivebase-Export-${timestamp}.dbase`;

	// Download the file
	const blob = await response.blob();
	const url = window.URL.createObjectURL(blob);
	const a = document.createElement("a");
	a.href = url;
	a.download = filename;
	document.body.appendChild(a);
	a.click();
	window.URL.revokeObjectURL(url);
	document.body.removeChild(a);
}
