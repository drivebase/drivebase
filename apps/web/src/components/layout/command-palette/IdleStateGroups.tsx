import { Trans } from "@lingui/react/macro";
import {
	CommandGroup,
	CommandItem,
	CommandSeparator,
} from "@/components/ui/command";
import {
	COMMUNITY_ITEMS,
	type CommunityItem,
	NAVIGATION_ITEMS,
} from "./constants";

type Props = {
	onSelectNavigation: (to: string) => void;
	onSelectCommunityItem: (href: string) => void;
};

function renderCommunityLabel(item: CommunityItem) {
	switch (item.id) {
		case "github":
			return <Trans>GitHub</Trans>;
		case "discord":
			return <Trans>Join Discord</Trans>;
		case "report-bug":
			return <Trans>Report Bug</Trans>;
		case "give-star":
			return <Trans>Give a Star</Trans>;
	}
}

export function IdleStateGroups({
	onSelectNavigation,
	onSelectCommunityItem,
}: Props) {
	return (
		<>
			<CommandGroup heading={<Trans>Navigation</Trans>}>
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
			<CommandGroup heading={<Trans>Community</Trans>}>
				{COMMUNITY_ITEMS.map((item) => (
					<CommandItem
						key={item.id}
						onSelect={() => onSelectCommunityItem(item.href)}
					>
						<item.icon className="h-4 w-4" />
						{renderCommunityLabel(item)}
					</CommandItem>
				))}
			</CommandGroup>
		</>
	);
}
