import { Search } from "lucide-react";
import { Button } from "@/components/ui/button";

type Props = {
	onOpen: () => void;
};

export function CommandPaletteTrigger({ onOpen }: Props) {
	return (
		<Button
			type="button"
			variant="outline"
			onClick={onOpen}
			className="w-full min-w-44 max-w-xs inline-flex items-center gap-2 justify-start text-muted-foreground hover:text-foreground"
		>
			<Search className="h-4 w-4" />
			<span className="flex-1 text-left">Search files and folders...</span>
			<kbd className="text-xs text-muted-foreground">⌘K / Ctrl+K</kbd>
		</Button>
	);
}
