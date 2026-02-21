import { ChevronRight, FolderPlus, Home, Loader2, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DroppableBreadcrumb } from "@/features/files/components/DroppableBreadcrumb";
import { cn } from "@/shared/lib/utils";

interface BreadcrumbItem {
	name: string;
	path: string;
	folderId: string | null;
}

interface FilesToolbarProps {
	currentPath: string;
	breadcrumbs: BreadcrumbItem[];
	canWriteFiles: boolean;
	isUploading: boolean;
	isLoading: boolean;
	onBreadcrumbClick: (path: string) => void;
	onUploadClick: () => void;
	onNewFolder: () => void;
	fileInputRef: React.RefObject<HTMLInputElement | null>;
	onFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

export function FilesToolbar({
	currentPath,
	breadcrumbs,
	canWriteFiles,
	isUploading,
	isLoading,
	onBreadcrumbClick,
	onUploadClick,
	onNewFolder,
	fileInputRef,
	onFileChange,
}: FilesToolbarProps) {
	return (
		<div className="flex items-center justify-between">
			<div className="flex items-center gap-1 text-sm text-muted-foreground bg-muted/30 p-2  w-fit">
				<DroppableBreadcrumb
					id="__root__"
					isCurrentPage={currentPath === "/"}
					onHoverNavigate={() => onBreadcrumbClick("/")}
				>
					<Button
						variant="ghost"
						size="sm"
						className={cn(
							"h-6 px-2 hover:bg-muted hover:text-foreground transition-colors",
							currentPath === "/" &&
								"text-foreground font-medium pointer-events-none",
						)}
						onClick={() => onBreadcrumbClick("/")}
					>
						<Home size={14} className="mr-1" />
						Home
					</Button>
				</DroppableBreadcrumb>
				{breadcrumbs.map((crumb, index) => {
					const isLast = index === breadcrumbs.length - 1;
					const droppableId = isLast
						? "__current__"
						: (crumb.folderId ?? `__disabled_${index}__`);
					const canDrop = !isLast && crumb.folderId !== null;
					return (
						<div key={crumb.path} className="flex items-center">
							<ChevronRight size={14} className="mx-1 opacity-50" />
							<DroppableBreadcrumb
								id={droppableId}
								isCurrentPage={isLast || !canDrop}
								onHoverNavigate={() => onBreadcrumbClick(crumb.path)}
							>
								<Button
									variant="ghost"
									size="sm"
									className={cn(
										"h-6 px-2 hover:bg-muted hover:text-foreground transition-colors",
										isLast && "text-foreground font-medium pointer-events-none",
									)}
									onClick={() => onBreadcrumbClick(crumb.path)}
								>
									{crumb.name}
								</Button>
							</DroppableBreadcrumb>
						</div>
					);
				})}
			</div>

			<div className="flex gap-2">
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
					</>
				) : null}
			</div>
		</div>
	);
}
