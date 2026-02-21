import {
	FileText,
	FolderIcon,
	Image as ImageIcon,
	Music,
	Video,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import type { FolderItemFragment } from "@/gql/graphql";
import { cn } from "@/shared/lib/utils";

// TODO: Map folder types based on content or metadata if available
const iconMap = {
	music: {
		icon: Music,
		color: "text-purple-600 dark:text-purple-400",
		bg: "bg-purple-100 dark:bg-purple-900/20",
	},
	image: {
		icon: ImageIcon,
		color: "text-blue-600 dark:text-blue-400",
		bg: "bg-blue-100 dark:bg-blue-900/20",
	},
	video: {
		icon: Video,
		color: "text-orange-600 dark:text-orange-400",
		bg: "bg-orange-100 dark:bg-orange-900/20",
	},
	document: {
		icon: FileText,
		color: "text-green-600 dark:text-green-400",
		bg: "bg-green-100 dark:bg-green-900/20",
	},
	other: {
		icon: FolderIcon,
		color: "text-gray-600 dark:text-gray-400",
		bg: "bg-gray-100 dark:bg-gray-800/50",
	},
};

export function FolderCard({
	folder,
	onClick,
}: {
	folder: FolderItemFragment;
	onClick?: () => void;
}) {
	// Fallback to 'other' until we have folder type logic
	const { icon: Icon, color, bg } = iconMap.other;

	return (
		<Card
			onClick={onClick}
			className="p-4 flex flex-col gap-4 border-none bg-muted/50 hover:bg-muted transition-colors cursor-pointer  min-w-[160px]"
		>
			<div
				className={cn("w-10 h-10  flex items-center justify-center", bg, color)}
			>
				<Icon size={20} />
			</div>
			<div>
				<h4 className="font-bold text-foreground truncate">{folder.name}</h4>
				<div className="flex justify-between text-xs text-muted-foreground mt-1">
					{/* Placeholder for file count/size until API supports it */}
					<span>Folder</span>
				</div>
			</div>
		</Card>
	);
}
