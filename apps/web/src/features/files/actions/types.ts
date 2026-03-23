import type { ComponentType } from "react";
import type { FileItemFragment, FolderItemFragment } from "@/gql/graphql";

export type ActionSurface = "contextMenu" | "toolbar" | "keyboard";

export type SelectionItem =
	| { kind: "file"; data: FileItemFragment }
	| { kind: "folder"; data: FolderItemFragment };

export interface ActionContext {
	/** Currently selected items */
	selection: SelectionItem[];
	/** Clears the current selection */
	clearSelection: () => void;
	/** Available storage providers */
	providers: ProviderInfo[];
	/** Current folder ID (undefined = root) */
	currentFolderId: string | undefined;
	/** Current folder name (undefined = root) */
	currentFolderName: string | undefined;
	/** Clipboard state summary */
	clipboard: {
		mode: "cut" | "copy" | null;
		status: "idle" | "staged" | "transferring";
		count: number;
	};
	/** Navigate to a folder */
	navigate: (folderId: string) => void;
	/** Refresh contents after mutation */
	refresh: () => void;
}

export interface FileAction {
	id: string;
	label: string | ((ctx: ActionContext) => string);
	icon: ComponentType<{ size?: number; className?: string }>;
	/** Keyboard shortcut display string (e.g. "Del", "F2") */
	shortcut?: string;
	/** Menu group for ordering: "quick" | "organize" | "library" | "danger" */
	group: "quick" | "organize" | "library" | "danger";
	/** Where this action can appear */
	surfaces: ActionSurface[];
	/** Visual variant */
	variant?: "default" | "destructive";
	/** Whether the action is enabled for the current selection */
	enabled: (ctx: ActionContext) => boolean;
	/** Execute the action */
	execute: (ctx: ActionContext) => Promise<void> | void;
	/** Optional: render a submenu instead of a simple item */
	submenu?: (ctx: ActionContext) => SubmenuItem[];
}

export interface SubmenuItem {
	id: string;
	label: string;
	icon?: ComponentType<{ className?: string }>;
	execute: () => Promise<void> | void;
}

export interface ProviderInfo {
	id: string;
	name: string;
	type: string;
}
