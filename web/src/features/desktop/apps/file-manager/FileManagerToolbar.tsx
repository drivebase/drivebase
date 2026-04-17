import { LayoutGrid, List, Columns2, ChevronDown, Check } from "lucide-react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

type SortOption = "none" | "name" | "kind" | "size" | "date-modified" | "date-created" | "date-added";

const SORT_OPTIONS: { id: SortOption; label: string }[] = [
	{ id: "none", label: "None" },
	{ id: "name", label: "Name" },
	{ id: "kind", label: "Kind" },
	{ id: "size", label: "Size" },
	{ id: "date-modified", label: "Date Modified" },
	{ id: "date-created", label: "Date Created" },
	{ id: "date-added", label: "Date Added" },
];

interface FileManagerToolbarProps {
	view: "list" | "grid";
	onViewChange: (v: "list" | "grid") => void;
	sortBy: SortOption;
	onSortChange: (s: SortOption) => void;
}

export function FileManagerToolbar({ view, onViewChange, sortBy, onSortChange }: FileManagerToolbarProps) {
	return (
		<div className="flex items-center gap-2 px-4 h-12 border-b border-border shrink-0">
			{/* View toggle */}
			<Tabs value={view} onValueChange={(v) => onViewChange(v as "list" | "grid")}>
				<TabsList>
					<TabsTrigger value="grid"><LayoutGrid size={14} /></TabsTrigger>
					<TabsTrigger value="list"><List size={14} /></TabsTrigger>
					<TabsTrigger value="columns"><Columns2 size={14} /></TabsTrigger>
				</TabsList>
			</Tabs>

			{/* Sort by */}
			<DropdownMenu>
				<DropdownMenuTrigger asChild>
					<button
						type="button"
						className="flex items-center gap-1.5 px-3 py-2 bg-muted rounded-xl text-sm text-muted-foreground hover:text-foreground transition-colors"
					>
						<LayoutGrid size={15} />
						<ChevronDown size={12} />
					</button>
				</DropdownMenuTrigger>
				<DropdownMenuContent align="start" className="w-48">
					<DropdownMenuItem onClick={() => onSortChange("none")}>
						<span className="w-4 shrink-0">{sortBy === "none" && <Check size={13} />}</span>
						None
					</DropdownMenuItem>
					<DropdownMenuSeparator />
					{SORT_OPTIONS.slice(1).map((opt) => (
						<DropdownMenuItem key={opt.id} onClick={() => onSortChange(opt.id)}>
							<span className="w-4 shrink-0">{sortBy === opt.id && <Check size={13} />}</span>
							{opt.label}
						</DropdownMenuItem>
					))}
				</DropdownMenuContent>
			</DropdownMenu>

			<div className="flex-1" />

			{/* Search */}
			<div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-muted w-52">
				<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-muted-foreground shrink-0">
					<circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
				</svg>
				<input
					type="text"
					placeholder="Search"
					className="bg-transparent text-sm text-foreground placeholder:text-muted-foreground outline-none w-full select-text"
				/>
			</div>
		</div>
	);
}
