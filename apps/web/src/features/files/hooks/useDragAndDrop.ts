import type { DragEndEvent, DragStartEvent } from "@dnd-kit/core";
import { PointerSensor, useSensor, useSensors } from "@dnd-kit/core";
import { useState } from "react";
import { toast } from "sonner";
import type { DragItem } from "@/features/files/FileSystemTable";
import { useMoveFile } from "@/features/files/hooks/useFiles";
import { useMoveFolder } from "@/features/files/hooks/useFolders";

interface UseDragAndDropOptions {
	fileList: {
		removeItems: (ids: Set<string>) => void;
	};
	folderList: {
		removeItems: (ids: Set<string>) => void;
	};
	syncEnabled: boolean;
	onMoveComplete: () => void;
}

export function useDragAndDrop({
	fileList,
	folderList,
	syncEnabled,
	onMoveComplete,
}: UseDragAndDropOptions) {
	const [, moveFile] = useMoveFile();
	const [, moveFolder] = useMoveFolder();
	const [activeDrag, setActiveDrag] = useState<DragItem | null>(null);

	const sensors = useSensors(
		useSensor(PointerSensor, {
			activationConstraint: {
				distance: 8,
			},
		}),
	);

	const handleDragStart = (event: DragStartEvent) => {
		const dragData = event.active.data.current as DragItem | undefined;
		if (dragData) {
			setActiveDrag(dragData);
		}
	};

	const handleDragEnd = (event: DragEndEvent) => {
		setActiveDrag(null);
		const { active, over } = event;
		if (!over) return;

		const dragData = active.data.current as DragItem | undefined;
		if (!dragData) return;

		const dropId = over.id as string;

		if (
			(dragData.type === "folder" && dropId === `folder:${dragData.id}`) ||
			dropId === `breadcrumb:__current__`
		) {
			return;
		}

		let targetFolderId: string | null = null;
		if (dropId.startsWith("folder:")) {
			targetFolderId = dropId.replace("folder:", "");
		} else if (dropId.startsWith("breadcrumb:")) {
			const breadcrumbFolderId = dropId.replace("breadcrumb:", "");
			targetFolderId =
				breadcrumbFolderId === "__root__" ? null : breadcrumbFolderId;
		} else {
			return;
		}

		if (syncEnabled && targetFolderId) {
			const targetProviderId = (
				over.data.current as { providerId?: string } | undefined
			)?.providerId;
			const sourceProviderId = dragData.item.providerId;

			if (
				targetProviderId &&
				sourceProviderId &&
				targetProviderId !== sourceProviderId
			) {
				toast.error(
					"Sync is enabled. Moving items across different providers is blocked.",
				);
				return;
			}
		}

		handleMoveItems([dragData], targetFolderId);
	};

	const handleDragCancel = () => {
		setActiveDrag(null);
	};

	const handleMoveItems = async (
		items: DragItem[],
		targetFolderId: string | null,
	) => {
		const movedFileIds = new Set(
			items.filter((i) => i.type === "file").map((i) => i.id),
		);
		const movedFolderIds = new Set(
			items.filter((i) => i.type === "folder").map((i) => i.id),
		);

		if (movedFileIds.size > 0) {
			fileList.removeItems(movedFileIds);
		}
		if (movedFolderIds.size > 0) {
			folderList.removeItems(movedFolderIds);
		}

		const failed: string[] = [];
		for (const item of items) {
			if (item.type === "file") {
				const result = await moveFile({
					id: item.id,
					folderId: targetFolderId,
				});
				if (result.error) {
					failed.push(item.name);
				}
			} else {
				const result = await moveFolder({
					id: item.id,
					parentId: targetFolderId,
				});
				if (result.error) {
					failed.push(item.name);
				}
			}
		}

		if (failed.length > 0) {
			toast.error(`Failed to move: ${failed.join(", ")}`);
			onMoveComplete();
		} else {
			toast.success(
				items.length === 1
					? `Moved "${items[0].name}"`
					: `Moved ${items.length} items`,
			);
		}
	};

	return {
		activeDrag,
		sensors,
		handleDragStart,
		handleDragEnd,
		handleDragCancel,
	};
}
