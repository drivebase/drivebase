import { useState } from "react";
import { toast } from "sonner";
import type { ExportOptions } from "../api/export";
import { exportWorkspace } from "../api/export";

export function useExport() {
	const [isExporting, setIsExporting] = useState(false);

	const handleExport = async (options: ExportOptions) => {
		setIsExporting(true);
		try {
			await exportWorkspace(options);
			toast.success("Workspace exported successfully");
		} catch (error) {
			const message =
				error instanceof Error ? error.message : "Failed to export workspace";
			toast.error(message);
			throw error;
		} finally {
			setIsExporting(false);
		}
	};

	return { isExporting, exportWorkspace: handleExport };
}
