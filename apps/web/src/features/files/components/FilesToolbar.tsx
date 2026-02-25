import {
	ChevronRight,
	FolderPlus,
	Home,
	Loader2,
	Settings,
	Upload,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { DroppableBreadcrumb } from "@/features/files/components/DroppableBreadcrumb";
import { ProviderFilter } from "@/features/files/components/ProviderFilter";
import type { BreadcrumbItem } from "@/features/files/hooks/useBreadcrumbs";
import { cn } from "@/shared/lib/utils";

interface Provider {
	id: string;
	name: string;
	type: string;
}

interface FilesToolbarProps {
	isRoot: boolean;
	breadcrumbs: BreadcrumbItem[];
	canWriteFiles: boolean;
	isUploading: boolean;
	isLoading: boolean;
	providers: Provider[];
	filterProviderIds: string[];
	onFilterChange: (ids: string[]) => void;
	onBreadcrumbClick: (folderId: string | null) => void;
	onUploadClick: () => void;
	onNewFolder: () => void;
	onOpenSettings: () => void;
	canManageSettings: boolean;
	fileInputRef: React.RefObject<HTMLInputElement | null>;
	onFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

export function FilesToolbar({
	isRoot,
	breadcrumbs,
	canWriteFiles,
	isUploading,
	isLoading,
	providers,
	filterProviderIds,
	onFilterChange,
	onBreadcrumbClick,
	onUploadClick,
	onNewFolder,
	onOpenSettings,
	canManageSettings,
	fileInputRef,
	onFileChange,
}: FilesToolbarProps) {
	return (
		<div className="flex items-center justify-between">
			<div className="flex items-center gap-1 text-sm text-muted-foreground bg-muted/30 px-2 py-1.5 w-fit">
				<DroppableBreadcrumb
					id="__root__"
					isCurrentPage={isRoot}
					onHoverNavigate={() => onBreadcrumbClick(null)}
				>
					<button
						type="button"
						className={cn(
							"inline-flex h-6 items-center rounded px-1.5 hover:text-foreground transition-colors",
							!isRoot && "hover:underline underline-offset-2",
							isRoot && "text-foreground font-medium pointer-events-none",
						)}
						onClick={() => onBreadcrumbClick(null)}
					>
						<Home size={14} className="mr-1" />
						Home
					</button>
				</DroppableBreadcrumb>
				{breadcrumbs.map((crumb, index) => {
					const isLast = index === breadcrumbs.length - 1;
					const droppableId = isLast
						? "__current__"
						: (crumb.folderId ?? `__disabled_${index}__`);
					const canDrop = !isLast && crumb.folderId !== null;
					return (
						<div key={`${crumb.name}-${index}`} className="flex items-center">
							<ChevronRight size={14} className="mx-1 opacity-50" />
							<DroppableBreadcrumb
								id={droppableId}
								isCurrentPage={isLast || !canDrop}
								onHoverNavigate={() => onBreadcrumbClick(crumb.folderId)}
							>
								<button
									type="button"
									className={cn(
										"inline-flex h-6 items-center rounded px-1.5 hover:text-foreground transition-colors",
										!isLast && "hover:underline underline-offset-2",
										isLast && "text-foreground font-medium pointer-events-none",
									)}
									onClick={() => onBreadcrumbClick(crumb.folderId)}
								>
									{crumb.name}
								</button>
							</DroppableBreadcrumb>
						</div>
					);
				})}
			</div>

			<div className="flex gap-2">
				<ProviderFilter
					providers={providers}
					selectedIds={filterProviderIds}
					onChange={onFilterChange}
				/>
				{canWriteFiles ? (
					<>
						<input
							type="file"
							ref={fileInputRef}
							onChange={onFileChange}
							multiple
							className="hidden"
						/>
						<Button
							onClick={onUploadClick}
							disabled={isUploading || isLoading}
							variant="outline"
						>
							{isUploading ? (
								<Loader2 className="animate-spin mr-2" size={18} />
							) : (
								<Upload size={18} className="mr-2" />
							)}
							Upload File
						</Button>
						<Button onClick={onNewFolder} disabled={isLoading}>
							<FolderPlus size={18} className="mr-2" />
							New Folder
						</Button>
						<Button
							type="button"
							variant="outline"
							size="icon"
							onClick={onOpenSettings}
							disabled={isLoading || !canManageSettings}
							aria-label="Files settings"
							title="Files settings"
						>
							<Settings size={18} />
						</Button>
					</>
				) : null}
			</div>
		</div>
	);
}
