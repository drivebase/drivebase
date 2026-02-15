import {
	FileArchive,
	FileCode2,
	FileIcon,
	FileText,
	ImageIcon,
	Music2,
	Video,
} from "lucide-react";
import { getFileKind } from "@/features/files/utils";
import { cn } from "@/shared/lib/utils";

interface FileMimeIconProps {
	mimeType?: string | null;
	className?: string;
}

export function FileMimeIcon({ mimeType, className }: FileMimeIconProps) {
	const kind = getFileKind(mimeType);

	const base = "w-8 h-8 rounded-lg flex items-center justify-center";

	if (kind === "image") {
		return (
			<div
				className={cn(
					base,
					"bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300",
					className,
				)}
			>
				<ImageIcon size={16} />
			</div>
		);
	}

	if (kind === "video") {
		return (
			<div
				className={cn(
					base,
					"bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300",
					className,
				)}
			>
				<Video size={16} />
			</div>
		);
	}

	if (kind === "audio") {
		return (
			<div
				className={cn(
					base,
					"bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-300",
					className,
				)}
			>
				<Music2 size={16} />
			</div>
		);
	}

	if (kind === "archive") {
		return (
			<div
				className={cn(
					base,
					"bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300",
					className,
				)}
			>
				<FileArchive size={16} />
			</div>
		);
	}

	if (kind === "code") {
		return (
			<div
				className={cn(
					base,
					"bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-300",
					className,
				)}
			>
				<FileCode2 size={16} />
			</div>
		);
	}

	if (kind === "pdf" || kind === "text" || kind === "document") {
		return (
			<div
				className={cn(
					base,
					"bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",
					className,
				)}
			>
				<FileText size={16} />
			</div>
		);
	}

	return (
		<div className={cn(base, "bg-primary/10 text-primary", className)}>
			<FileIcon size={16} />
		</div>
	);
}
