import { useExport } from "./hooks/useExport";
import { ExportSection } from "./sections/ExportSection";

export function AdvancedSettingsView() {
	const { isExporting, exportWorkspace } = useExport();

	return (
		<div className="space-y-8">
			<ExportSection onExport={exportWorkspace} isExporting={isExporting} />
		</div>
	);
}
