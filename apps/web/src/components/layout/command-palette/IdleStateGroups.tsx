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

function getCommunityValue(item: CommunityItem) {
	switch (item.id) {
		case "github":
			return "github repo repository";
		case "discord":
			return "join discord community chat support";
		case "report-bug":
			return "report bug issue feedback";
		case "give-star":
			return "give a star star on github";
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
						value={item.label}
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
						value={getCommunityValue(item)}
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
