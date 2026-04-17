import { useEffect, useState } from "react";
import { FileManagerSidebar } from "./FileManagerSidebar";
import { FileManagerToolbar } from "./FileManagerToolbar";
import { FileList } from "./FileList";
import { SIDEBAR_SOURCES, DUMMY_FILES } from "./dummy-data";
import type { FileManagerLocation, SidebarSource } from "./types";
import { useDesktop } from "../../hooks/use-desktop";
import { useWindowManagerStore } from "@/store/window-manager";

interface FileManagerAppProps {
	windowId: string;
}

function isSidebarSourceId(value: unknown): value is SidebarSource["id"] {
	return SIDEBAR_SOURCES.some((source) => source.id === value);
}

export function FileManagerApp({ windowId }: FileManagerAppProps) {
	const { updateAppState } = useDesktop();
	const selectedLocationId = useWindowManagerStore((state) => {
		const locationId = state.windows[windowId]?.appState.locationId;
		return typeof locationId === "string" ? locationId : null;
	});
	const legacySourceId = useWindowManagerStore((state) => {
		const sourceId = state.windows[windowId]?.appState.sourceId;
		return isSidebarSourceId(sourceId) ? sourceId : null;
	});
	const [activeId, setActiveId] = useState<FileManagerLocation>(
		(selectedLocationId as FileManagerLocation | null) ?? legacySourceId ?? "recent",
	);
	const [view, setView] = useState<"list" | "grid">("list");
	const [sortBy, setSortBy] = useState<"none" | "name" | "kind" | "size" | "date-modified" | "date-created" | "date-added">("none");

	useEffect(() => {
		const nextLocation =
			(selectedLocationId as FileManagerLocation | null) ?? legacySourceId;
		if (nextLocation && nextLocation !== activeId) {
			setActiveId(nextLocation);
		}
	}, [activeId, legacySourceId, selectedLocationId]);

	function handleSelect(nextId: FileManagerLocation) {
		setActiveId(nextId);
		updateAppState(windowId, {
			locationId: nextId,
			sourceId: isSidebarSourceId(nextId) ? nextId : undefined,
		});
	}

	return (
		<div className="flex h-full">
			<FileManagerSidebar
				windowId={windowId}
				sources={SIDEBAR_SOURCES}
				activeId={activeId}
				onSelect={handleSelect}
			/>
			<div className="flex-1 flex flex-col min-w-0">
				<FileManagerToolbar view={view} onViewChange={setView} sortBy={sortBy} onSortChange={setSortBy} />
				<div className="flex-1 overflow-auto">
					<FileList files={DUMMY_FILES} view={view} />
				</div>
			</div>
		</div>
	);
}
