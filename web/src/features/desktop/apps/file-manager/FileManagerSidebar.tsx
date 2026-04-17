import { FolderOpen, Cloud, HardDrive, Clock, Share2, Star } from "lucide-react";
import type { FileManagerLocation, SidebarSource } from "./types";
import type { AppContextTargetData } from "@/features/desktop/app-context-menu-registry";

const SOURCE_ICON_MAP = {
	files: FolderOpen,
	"google-drive": Cloud,
	dropbox: Cloud,
	local: HardDrive,
	trash: FolderOpen,
};

const VIEW_ITEMS = [
	{ id: "recent", label: "Recents", icon: Clock },
	{ id: "shared", label: "Shared", icon: Share2 },
	{ id: "starred", label: "Starred", icon: Star },
] as const;

interface FileManagerSidebarProps {
	windowId: string;
	sources: SidebarSource[];
	activeId: FileManagerLocation;
	onSelect: (id: FileManagerLocation) => void;
}

function getContextData(data: AppContextTargetData): string {
	return JSON.stringify(data);
}

export function FileManagerSidebar({
	windowId,
	sources,
	activeId,
	onSelect,
}: FileManagerSidebarProps) {
	return (
		<div className="flex flex-col h-full w-48 border-r border-border bg-muted/30 py-3 shrink-0">
			<div className="px-3 pb-1">
				<p className="text-[10px] font-semibold tracking-widest text-muted-foreground uppercase">
					Browse
				</p>
			</div>
			<nav className="px-2 space-y-0.5 mb-4">
				{VIEW_ITEMS.map(({ id, label, icon: Icon }) => (
					<button
						key={id}
						type="button"
						data-context-type="app"
						data-context-data={getContextData({
							appId: "file-manager",
							windowId,
							entityType: "sidebar-item",
							entityId: id,
							label,
							metadata: {
								locationId: id,
								capabilities: ["open", "open-new-window", "get-info"],
								category: "view",
							},
						})}
						onClick={() => onSelect(id)}
						className={`flex items-center gap-2.5 w-full px-2.5 py-1.5 rounded-lg text-sm transition-colors ${
							activeId === id
								? "bg-accent text-accent-foreground"
								: "text-muted-foreground hover:text-foreground"
						}`}
					>
						<Icon size={15} />
						{label}
					</button>
				))}
			</nav>

			<div className="px-3 pb-1">
				<p className="text-[10px] font-semibold tracking-widest text-muted-foreground uppercase">
					Sources
				</p>
			</div>
			<nav className="px-2 space-y-0.5">
				{sources.map((source) => {
					const Icon = SOURCE_ICON_MAP[source.icon];
					return (
						<button
							key={source.id}
							type="button"
							data-context-type="app"
							data-context-data={getContextData({
								appId: "file-manager",
								windowId,
								entityType: "sidebar-item",
								entityId: source.id,
								label: source.label,
								metadata: {
									locationId: source.id,
									sourceId: source.id,
									capabilities: [
										"open",
										"open-new-window",
										"get-info",
										...(source.id !== "local" ? ["disconnect"] : []),
									],
									category: "source",
								},
							})}
							onClick={() => onSelect(source.id)}
							className={`flex items-center gap-2.5 w-full px-2.5 py-1.5 rounded-lg text-sm transition-colors ${
								activeId === source.id
									? "bg-accent text-accent-foreground"
									: "text-muted-foreground hover:text-foreground"
							}`}
						>
							<Icon size={15} />
							{source.label}
						</button>
					);
				})}
			</nav>
		</div>
	);
}
