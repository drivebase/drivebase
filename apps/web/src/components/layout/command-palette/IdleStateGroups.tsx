import { Clock3 } from "@/shared/components/icons/solar";
import {
	CommandGroup,
	CommandItem,
	CommandSeparator,
	CommandShortcut,
} from "@/components/ui/command";
import { formatSize } from "@/features/files/utils";
import { ProviderIcon } from "@/features/providers/ProviderIcon";
import type { FileItemFragment } from "@/gql/graphql";
import { NAVIGATION_ITEMS } from "./constants";

type Props = {
	recentFiles: FileItemFragment[];
	onSelectNavigation: (to: string) => void;
	onSelectRecentFile: (file: FileItemFragment) => void;
};

export function IdleStateGroups({
	recentFiles,
	onSelectNavigation,
	onSelectRecentFile,
}: Props) {
	return (
		<>
			<CommandGroup heading="Navigation">
				{NAVIGATION_ITEMS.map((item) => (
					<CommandItem
						key={item.to}
						onSelect={() => onSelectNavigation(item.to)}
					>
						<item.icon className="h-4 w-4" />
						{item.label}
					</CommandItem>
				))}
			</CommandGroup>
			<CommandSeparator />
			<CommandGroup heading="Recent files">
				{recentFiles.map((file) => (
					<CommandItem key={file.id} onSelect={() => onSelectRecentFile(file)}>
						<Clock3 className="h-4 w-4 text-muted-foreground" />
						<ProviderIcon type={file.provider.type} className="h-4 w-4" />
						<span className="flex-1 truncate">{file.name}</span>
						<CommandShortcut>{formatSize(file.size)}</CommandShortcut>
					</CommandItem>
				))}
				{recentFiles.length === 0 ? (
					<CommandItem disabled>No recent files</CommandItem>
				) : null}
			</CommandGroup>
		</>
	);
}
