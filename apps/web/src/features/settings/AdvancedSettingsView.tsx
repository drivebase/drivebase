import { useExport } from "./hooks/useExport";
import { ExportSection } from "./sections/ExportSection";
import { UpdateSection } from "./sections/UpdateSection";

export function AdvancedSettingsView() {
	const { isExporting, exportWorkspace } = useExport();

	return (
		<div className="space-y-8">
			<UpdateSection />
			<ExportSection onExport={exportWorkspace} isExporting={isExporting} />
		</div>
	);
}
