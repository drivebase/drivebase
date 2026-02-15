import { useLocation, useNavigate } from "@tanstack/react-router";
import { Search, SlidersHorizontal } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import {
	Autocomplete,
	AutocompleteContent,
	AutocompleteControl,
	AutocompleteEmpty,
	AutocompleteInput,
	AutocompleteItem,
	AutocompleteList,
} from "@/components/ui/base-autocomplete";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { getPageTitle } from "@/config/pageTitles";
import { useSearchFiles } from "@/features/files/hooks/useFiles";
import type { FileItemFragment } from "@/gql/graphql";
import { useFilesStore } from "@/shared/store/filesStore";

export function Header() {
	const setSearchQuery = useFilesStore((state) => state.setSearchQuery);
	const setFilterType = useFilesStore((state) => state.setFilterType);
	const [inputValue, setInputValue] = useState("");
	const [debouncedQuery, setDebouncedQuery] = useState("");
	const location = useLocation();
	const navigate = useNavigate();
	const { data, fetching } = useSearchFiles(debouncedQuery, 5);

	const pageTitle = getPageTitle(location.pathname);
	const searchResults = useMemo(
		() => ((data?.searchFiles || []) as FileItemFragment[]).slice(0, 5),
		[data?.searchFiles],
	);

	useEffect(() => {
		const timeout = setTimeout(() => {
			setDebouncedQuery(inputValue.trim());
		}, 250);
		return () => clearTimeout(timeout);
	}, [inputValue]);

	const getParentPath = (virtualPath: string) => {
		const parts = virtualPath.split("/").filter(Boolean);
		parts.pop();
		return parts.length > 0 ? `/${parts.join("/")}` : "/";
	};

	return (
		<header className="flex items-center justify-between px-8 py-6">
			<h1 className="text-3xl font-bold text-foreground">{pageTitle}</h1>
			<div className="flex items-center gap-4 flex-1 max-w-sm ml-8">
				<div className="relative w-full">
					<Autocomplete
						items={searchResults}
						onValueChange={(value) => {
							if (value) {
								const selectedFile = searchResults.find(
									(file) => file.id === value,
								);
								if (!selectedFile) return;

								const parentPath = getParentPath(selectedFile.virtualPath);
								setSearchQuery(selectedFile.name);
								setInputValue(selectedFile.name);
								navigate({
									to: "/files",
									search: { path: parentPath },
								});
							}
						}}
					>
						<AutocompleteControl className="w-full">
							<Search
								className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground z-10"
								size={16}
							/>
							<AutocompleteInput
								value={inputValue}
								onChange={(e) => {
									const value = e.target.value;
									setInputValue(value);
									setSearchQuery(value);
								}}
								placeholder="Search files..."
								className="pl-9 pr-9 h-10 text-sm rounded-lg bg-background border border-border w-full"
							/>
							<div className="absolute right-3 top-1/2 -translate-y-1/2 z-10">
								<DropdownMenu>
									<DropdownMenuTrigger asChild>
										<SlidersHorizontal
											className="text-muted-foreground cursor-pointer hover:text-foreground transition-colors"
											size={16}
										/>
									</DropdownMenuTrigger>
									<DropdownMenuContent
										align="end"
										className="w-48 bg-card border-border rounded-xl shadow-lg"
									>
										<DropdownMenuItem
											onClick={() => setFilterType("all")}
											className="cursor-pointer hover:bg-muted/50 rounded-lg m-1"
										>
											All Files
										</DropdownMenuItem>
										<DropdownMenuItem
											onClick={() => setFilterType("document")}
											className="cursor-pointer hover:bg-muted/50 rounded-lg m-1"
										>
											Documents
										</DropdownMenuItem>
										<DropdownMenuItem
											onClick={() => setFilterType("image")}
											className="cursor-pointer hover:bg-muted/50 rounded-lg m-1"
										>
											Images
										</DropdownMenuItem>
										<DropdownMenuItem
											onClick={() => setFilterType("video")}
											className="cursor-pointer hover:bg-muted/50 rounded-lg m-1"
										>
											Videos
										</DropdownMenuItem>
										<DropdownMenuItem
											onClick={() => setFilterType("audio")}
											className="cursor-pointer hover:bg-muted/50 rounded-lg m-1"
										>
											Audio
										</DropdownMenuItem>
									</DropdownMenuContent>
								</DropdownMenu>
							</div>
						</AutocompleteControl>
						<AutocompleteContent className="w-[var(--anchor-width)] min-w-[var(--anchor-width)] bg-popover text-popover-foreground border-border rounded-xl shadow-lg mt-2 z-50">
							<AutocompleteEmpty className="p-2 text-muted-foreground text-sm text-center">
								{debouncedQuery.length === 0
									? "Type to search files"
									: fetching
										? "Searching..."
										: "No results found."}
							</AutocompleteEmpty>
							<AutocompleteList>
								{(file) => (
									<AutocompleteItem
										key={file.id}
										value={file.id}
										className="cursor-pointer rounded-lg m-1"
									>
										{file.name}
									</AutocompleteItem>
								)}
							</AutocompleteList>
						</AutocompleteContent>
					</Autocomplete>
				</div>
			</div>
		</header>
	);
}
