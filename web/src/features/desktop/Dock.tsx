import { getAllApps } from "./app-registry";
import { DockItem } from "./DockItem";
import { DockSeparator } from "./DockSeparator";

export function Dock() {
	const dockApps = getAllApps().filter((a) => a.showInDock !== false);
	const mainApps = dockApps.filter((a) => (a.dockGroup ?? "main") === "main");
	const utilApps = dockApps.filter((a) => a.dockGroup === "utility");

	const allItems = [
		...mainApps.map((app) => ({ type: "app" as const, app })),
		...(utilApps.length > 0
			? [
					{ type: "separator" as const, app: null },
					...utilApps.map((app) => ({ type: "app" as const, app })),
				]
			: []),
	];

	return (
		<div className="fixed bottom-3 left-1/2 -translate-x-1/2 z-[9999]">
			<div className="flex items-end gap-1 px-3 py-2 bg-white/10 backdrop-blur-2xl border border-white/20 rounded-2xl">
				{allItems.map((item) => {
					if (item.type === "separator") {
						return <DockSeparator key="separator" />;
					}
					return <DockItem key={item.app!.id} app={item.app!} />;
				})}
			</div>
		</div>
	);
}
