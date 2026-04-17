import { useState } from "react";
import { FileManagerSidebar } from "./FileManagerSidebar";
import { FileManagerToolbar } from "./FileManagerToolbar";
import { FileList } from "./FileList";
import { SIDEBAR_SOURCES, DUMMY_FILES } from "./dummy-data";

interface FileManagerAppProps {
	windowId: string;
}

export function FileManagerApp({ windowId: _ }: FileManagerAppProps) {
	const [activeId, setActiveId] = useState<string>("google-drive");
	const [view, setView] = useState<"list" | "grid">("list");
	const [sortBy, setSortBy] = useState<"none" | "name" | "kind" | "size" | "date-modified" | "date-created" | "date-added">("none");

	return (
		<div className="flex h-full">
			<FileManagerSidebar
				sources={SIDEBAR_SOURCES}
				activeId={activeId}
				onSelect={setActiveId}
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
