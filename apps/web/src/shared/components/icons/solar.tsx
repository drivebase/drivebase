import * as React from "react";

import { cn } from "@/shared/lib/utils";

type SolarIconProps = Omit<React.HTMLAttributes<HTMLSpanElement>, "color"> & {
	size?: number | string;
	color?: string;
	strokeWidth?: number;
	absoluteStrokeWidth?: boolean;
};

export type LucideIcon = React.ComponentType<SolarIconProps>;

function createSolarIcon(iconClassName: string): LucideIcon {
	const Icon = React.forwardRef<HTMLSpanElement, SolarIconProps>(
		({ className, size, color, style, ...props }, ref) => {
			const sizedStyle =
				size !== undefined
					? { width: size, height: size, color, ...style }
					: { color, ...style };

			return (
				<span
					ref={ref}
					aria-hidden="true"
					className={cn(
						"inline-block h-4 w-4 shrink-0",
						iconClassName,
						className,
					)}
					style={sizedStyle}
					{...props}
				/>
			);
		},
	);
	Icon.displayName = `SolarIcon(${iconClassName})`;
	return Icon;
}

export const Activity = createSolarIcon("icon-[solar--pulse-linear]");
export const AlertCircle = createSolarIcon(
	"icon-[solar--danger-circle-linear]",
);
export const AlertTriangle = createSolarIcon(
	"icon-[solar--danger-triangle-linear]",
);
export const ArrowDown = createSolarIcon("icon-[solar--alt-arrow-down-linear]");
export const ArrowLeft = createSolarIcon("icon-[solar--alt-arrow-left-linear]");
export const ArrowRight = createSolarIcon(
	"icon-[solar--alt-arrow-right-linear]",
);
export const ArrowUp = createSolarIcon("icon-[solar--alt-arrow-up-linear]");
export const Check = createSolarIcon("icon-[solar--check-circle-linear]");
export const CheckCircle = createSolarIcon("icon-[solar--check-circle-linear]");
export const CheckCircle2 = createSolarIcon(
	"icon-[solar--check-circle-linear]",
);
export const CheckIcon = createSolarIcon("icon-[solar--check-square-linear]");
export const ChevronDown = createSolarIcon(
	"icon-[solar--alt-arrow-down-linear]",
);
export const ChevronDownIcon = createSolarIcon(
	"icon-[solar--alt-arrow-down-linear]",
);
export const ChevronRight = createSolarIcon(
	"icon-[solar--alt-arrow-right-linear]",
);
export const ChevronRightIcon = createSolarIcon(
	"icon-[solar--alt-arrow-right-linear]",
);
export const ChevronUp = createSolarIcon("icon-[solar--alt-arrow-up-linear]");
export const ChevronUpIcon = createSolarIcon(
	"icon-[solar--alt-arrow-up-linear]",
);
export const Clock3 = createSolarIcon("icon-[solar--clock-circle-linear]");
export const Cloud = createSolarIcon("icon-[solar--cloud-linear]");
export const Columns = createSolarIcon("icon-[solar--widget-4-linear]");
export const Copy = createSolarIcon("icon-[solar--copy-linear]");
export const Download = createSolarIcon("icon-[solar--download-linear]");
export const ExternalLink = createSolarIcon("icon-[solar--link-linear]");
export const Eye = createSolarIcon("icon-[solar--eye-linear]");
export const File = createSolarIcon("icon-[solar--file-linear]");
export const FileArchive = createSolarIcon("icon-[solar--archive-linear]");
export const FileCode2 = createSolarIcon("icon-[solar--code-file-linear]");
export const FileIcon = createSolarIcon("icon-[solar--file-linear]");
export const FileText = createSolarIcon("icon-[solar--document-text-linear]");
export const Fingerprint = createSolarIcon(
	"icon-[material-symbols--fingerprint]",
);
export const Files = createSolarIcon("icon-[solar--documents-linear]");
export const Filter = createSolarIcon("icon-[solar--filter-linear]");
export const Folder = createSolarIcon("icon-[solar--folder-linear]");
export const FolderIcon = createSolarIcon("icon-[solar--folder-linear]");
export const FolderOpen = createSolarIcon("icon-[solar--folder-open-linear]");
export const FolderPlus = createSolarIcon(
	"icon-[solar--folder-with-files-linear]",
);
export const Github = createSolarIcon("icon-[solar--code-linear]");
export const HardDrive = createSolarIcon("icon-[solar--ssd-square-linear]");
export const Home = createSolarIcon("icon-[solar--home-2-linear]");
export const Image = createSolarIcon("icon-[solar--gallery-linear]");
export const ImageIcon = createSolarIcon("icon-[solar--gallery-linear]");
export const Info = createSolarIcon("icon-[solar--info-circle-linear]");
export const Key = createSolarIcon("icon-[solar--key-linear]");
export const KeyRound = createSolarIcon("icon-[solar--key-linear]");
export const Laptop = createSolarIcon("icon-[solar--smartphone-2-linear]");
export const Link2 = createSolarIcon("icon-[solar--link-linear]");
export const Loader2 = createSolarIcon("icon-[solar--refresh-linear]");
export const Lock = createSolarIcon("icon-[solar--lock-linear]");
export const Mail = createSolarIcon("icon-[solar--letter-linear]");
export const Moon = createSolarIcon("icon-[solar--moon-linear]");
export const MoreHorizontal = createSolarIcon("icon-[solar--menu-dots-linear]");
export const MoreHorizontalIcon = createSolarIcon(
	"icon-[solar--menu-dots-linear]",
);
export const MoreVertical = createSolarIcon("icon-[solar--menu-dots-linear]");
export const Move = createSolarIcon(
	"icon-[solar--round-transfer-horizontal-linear]",
);
export const Music = createSolarIcon("icon-[solar--music-note-linear]");
export const Music2 = createSolarIcon("icon-[solar--music-note-linear]");
export const Pencil = createSolarIcon("icon-[solar--pen-2-linear]");
export const Phone = createSolarIcon("icon-[solar--phone-linear]");
export const Plus = createSolarIcon("icon-[solar--add-circle-linear]");
export const RefreshCw = createSolarIcon("icon-[solar--refresh-linear]");
export const Save = createSolarIcon("icon-[solar--diskette-linear]");
export const Search = createSolarIcon("icon-[solar--magnifer-linear]");
export const SearchIcon = createSolarIcon("icon-[solar--magnifer-linear]");
export const Server = createSolarIcon("icon-[solar--server-linear]");
export const Settings = createSolarIcon("icon-[solar--settings-linear]");
export const Settings2 = createSolarIcon(
	"icon-[solar--settings-minimalistic-linear]",
);
export const Share2 = createSolarIcon("icon-[solar--share-linear]");
export const Shield = createSolarIcon("icon-[solar--shield-linear]");
export const ShieldAlert = createSolarIcon(
	"icon-[solar--shield-warning-linear]",
);
export const ShieldCheck = createSolarIcon("icon-[solar--shield-check-linear]");
export const SlidersHorizontal = createSolarIcon(
	"icon-[solar--settings-linear]",
);
export const Sparkle = createSolarIcon("icon-[solar--stars-linear]");
export const Star = createSolarIcon("icon-[solar--star-linear]");
export const Sun = createSolarIcon("icon-[solar--sun-2-linear]");
export const Trash = createSolarIcon("icon-[solar--trash-bin-trash-linear]");
export const Trash2 = createSolarIcon("icon-[solar--trash-bin-trash-linear]");
export const Upload = createSolarIcon("icon-[solar--upload-linear]");
export const User = createSolarIcon("icon-[solar--user-linear]");
export const Users = createSolarIcon(
	"icon-[solar--users-group-rounded-linear]",
);
export const Video = createSolarIcon("icon-[solar--video-frame-linear]");
export const Wrench = createSolarIcon("icon-[solar--settings-linear]");
export const X = createSolarIcon("icon-[solar--close-circle-linear]");
export const XCircle = createSolarIcon("icon-[solar--close-circle-linear]");
export const XIcon = createSolarIcon("icon-[solar--close-circle-linear]");
export const Zap = createSolarIcon("icon-[solar--bolt-linear]");
