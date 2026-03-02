import { Separator } from "@/components/ui/separator";
import { useExport } from "./hooks/useExport";
import { ExportSection } from "./sections/ExportSection";
import { UpdateSection } from "./sections/UpdateSection";
import { VaultKeySection } from "./sections/VaultKeySection";

export function AdvancedSettingsView() {
	const { isExporting, exportWorkspace } = useExport();

	return (
		<div className="space-y-8">
			<div className="px-8 pt-8">
				<UpdateSection />
			</div>
			<Separator />

			<div className="px-8">
				<ExportSection onExport={exportWorkspace} isExporting={isExporting} />
			</div>
			<Separator />

			<div className="px-8">
				<VaultKeySection />
			</div>
		</div>
	);
}
