import { Image, FileText, File, Video } from "lucide-react";
import type { FileItem } from "./types";

const ICON_CONFIG: Record<FileItem["icon"], { icon: typeof Image; bg: string; color: string }> = {
	image:    { icon: Image,    bg: "bg-blue-500/10",   color: "text-blue-500" },
	pdf:      { icon: FileText, bg: "bg-red-500/10",    color: "text-red-500" },
	document: { icon: File,     bg: "bg-yellow-500/10", color: "text-yellow-500" },
	video:    { icon: Video,    bg: "bg-purple-500/10", color: "text-purple-500" },
	folder:   { icon: File,     bg: "bg-primary/10",    color: "text-primary" },
	archive:  { icon: File,     bg: "bg-green-500/10",  color: "text-green-500" },
};

interface FileIconProps {
	type: FileItem["icon"];
	size?: "sm" | "lg";
}

export function FileIcon({ type, size = "sm" }: FileIconProps) {
	const { icon: Icon, bg, color } = ICON_CONFIG[type];
	const isLg = size === "lg";

	return (
		<div className={`${isLg ? "w-12 h-12" : "w-8 h-8"} rounded-xl ${bg} flex items-center justify-center shrink-0`}>
			<Icon size={isLg ? 22 : 15} className={color} />
		</div>
	);
}
