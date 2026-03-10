import { useMemo, useRef } from "react";
import type { SelectionItem } from "../../actions/types";
import { useFileExplorer } from "../../context/FileExplorerProvider";
import { useSelection } from "../../context/SelectionContext";
import { useMarquee } from "../../hooks/useMarquee";
import { Toolbar } from "../Toolbar";
import { GridFileItem } from "./GridFileItem";
import { GridFolderItem } from "./GridFolderItem";

export function GridView() {
	const { files, folders } = useFileExplorer();
	const selection = useSelection();
	const containerRef = useRef<HTMLDivElement | null>(null);
	const itemRefs = useRef<Record<string, HTMLDivElement | null>>({});

	const items = useMemo(() => {
		const result: { id: string; item: SelectionItem }[] = [];
		for (const folder of folders) {
			result.push({
				id: `folder:${folder.id}`,
				item: { kind: "folder", data: folder },
			});
		}
		for (const file of files) {
			result.push({
				id: `file:${file.id}`,
				item: { kind: "file", data: file },
			});
		}
		return result;
	}, [files, folders]);

	const { marqueeRect, handlePointerDown } = useMarquee({
		items,
		itemRefs,
		containerRef,
		setItems: selection.setItems,
		clear: selection.clear,
		selectedIds: selection.selectedIds,
	});

	return (
		<div className="space-y-3">
			<Toolbar />
			<div
				ref={containerRef}
				className="relative select-none"
				onPointerDown={handlePointerDown}
			>
				{marqueeRect ? (
					<div
						className="pointer-events-none absolute z-20 border border-primary bg-primary/10"
						style={{
							left: marqueeRect.left,
							top: marqueeRect.top,
							width: marqueeRect.width,
							height: marqueeRect.height,
						}}
					/>
				) : null}
				<div className="space-y-10">
					{folders.length ? (
						<div className="space-y-2">
							<div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-3">
								{folders.map((folder) => (
									<div key={folder.id} className="w-full flex-1">
										<GridFolderItem
											folder={folder}
											registerRef={(node) => {
												itemRefs.current[`folder:${folder.id}`] = node;
											}}
										/>
									</div>
								))}
							</div>
						</div>
					) : null}
					{files.length ? (
						<div className="space-y-2">
							<div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-5 2xl:grid-cols-6">
								{files.map((file) => (
									<GridFileItem
										key={file.id}
										file={file}
										registerRef={(node) => {
											itemRefs.current[`file:${file.id}`] = node;
										}}
									/>
								))}
							</div>
						</div>
					) : null}
				</div>
			</div>
		</div>
	);
}
