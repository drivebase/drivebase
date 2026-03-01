import { Filter } from "@/shared/components/icons/solar";
import { Button } from "@/components/ui/button";
import {
	DropdownMenu,
	DropdownMenuCheckboxItem,
	DropdownMenuContent,
	DropdownMenuLabel,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ProviderIcon } from "@/features/providers/ProviderIcon";

interface Provider {
	id: string;
	name: string;
	type: string;
}

interface ProviderFilterProps {
	providers: Provider[];
	selectedIds: string[];
	onChange: (ids: string[]) => void;
}

export function ProviderFilter({
	providers,
	selectedIds,
	onChange,
}: ProviderFilterProps) {
	if (providers.length <= 1) return null;

	const allSelected =
		selectedIds.length === 0 || selectedIds.length === providers.length;

	const handleToggle = (providerId: string) => {
		if (allSelected) {
			// Switch from "all" to just this one unselected
			onChange(providers.filter((p) => p.id !== providerId).map((p) => p.id));
		} else if (selectedIds.includes(providerId)) {
			const next = selectedIds.filter((id) => id !== providerId);
			// If nothing selected, reset to all
			onChange(next.length === 0 ? [] : next);
		} else {
			const next = [...selectedIds, providerId];
			// If all selected, reset to empty (= all)
			onChange(next.length === providers.length ? [] : next);
		}
	};

	const handleSelectAll = () => {
		onChange([]);
	};

	return (
		<DropdownMenu>
			<DropdownMenuTrigger asChild>
				<Button variant="outline" size="sm" className="h-8">
					<Filter size={14} className="mr-1.5" />
					{allSelected
						? "All Providers"
						: `${selectedIds.length} Provider${selectedIds.length > 1 ? "s" : ""}`}
				</Button>
			</DropdownMenuTrigger>
			<DropdownMenuContent align="start" className="w-56">
				<DropdownMenuLabel>Filter by Provider</DropdownMenuLabel>
				<DropdownMenuSeparator />
				<DropdownMenuCheckboxItem
					checked={allSelected}
					onCheckedChange={handleSelectAll}
				>
					All Providers
				</DropdownMenuCheckboxItem>
				<DropdownMenuSeparator />
				{providers.map((provider) => (
					<DropdownMenuCheckboxItem
						key={provider.id}
						checked={allSelected ? true : selectedIds.includes(provider.id)}
						onCheckedChange={() => handleToggle(provider.id)}
					>
						<ProviderIcon
							type={provider.type}
							className="h-4 w-4 mr-2 shrink-0"
						/>
						{provider.name}
					</DropdownMenuCheckboxItem>
				))}
			</DropdownMenuContent>
		</DropdownMenu>
	);
}
