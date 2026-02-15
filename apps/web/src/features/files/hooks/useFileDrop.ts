import { useRef, useState } from "react";

interface UseFileDropOptions {
	onDrop: (files: File[]) => void;
}

export function useFileDrop({ onDrop }: UseFileDropOptions) {
	const [isDragActive, setIsDragActive] = useState(false);
	const dragDepthRef = useRef(0);

	const handleDragEnter = (e: React.DragEvent<HTMLDivElement>) => {
		e.preventDefault();
		e.stopPropagation();
		dragDepthRef.current += 1;
		if (e.dataTransfer.items && e.dataTransfer.items.length > 0) {
			setIsDragActive(true);
		}
	};

	const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
		e.preventDefault();
		e.stopPropagation();
		dragDepthRef.current -= 1;
		if (dragDepthRef.current <= 0) {
			setIsDragActive(false);
			dragDepthRef.current = 0;
		}
	};

	const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
		e.preventDefault();
		e.stopPropagation();
	};

	const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
		e.preventDefault();
		e.stopPropagation();
		setIsDragActive(false);
		dragDepthRef.current = 0;
		const droppedFiles = Array.from(e.dataTransfer.files || []);
		onDrop(droppedFiles);
	};

	return {
		isDragActive,
		dragHandlers: {
			onDragEnter: handleDragEnter,
			onDragLeave: handleDragLeave,
			onDragOver: handleDragOver,
			onDrop: handleDrop,
		},
	};
}
