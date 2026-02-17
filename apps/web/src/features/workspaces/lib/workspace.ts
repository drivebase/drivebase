import { ACTIVE_WORKSPACE_STORAGE_KEY } from "@/features/workspaces/api/workspace";
import { WorkspaceColor } from "@/gql/graphql";

export const WORKSPACE_COLORS: Array<{
	value: WorkspaceColor;
	className: string;
}> = [
	{ value: WorkspaceColor.Rose, className: "bg-rose-200 text-black" },
	{ value: WorkspaceColor.Peach, className: "bg-orange-200 text-black" },
	{ value: WorkspaceColor.Amber, className: "bg-amber-200 text-black" },
	{ value: WorkspaceColor.Mint, className: "bg-emerald-200 text-black" },
	{ value: WorkspaceColor.Sky, className: "bg-sky-200 text-black" },
];

const WORKSPACE_COLOR_CLASS_BY_VALUE = new Map(
	WORKSPACE_COLORS.map((entry) => [entry.value, entry.className]),
);

export function getWorkspaceColorClass(color: string | null | undefined) {
	const normalized = (
		color ?? WorkspaceColor.Sky
	).toUpperCase() as WorkspaceColor;
	return (
		WORKSPACE_COLOR_CLASS_BY_VALUE.get(normalized) ?? "bg-sky-200 text-black"
	);
}

export function getActiveWorkspaceId() {
	return localStorage.getItem(ACTIVE_WORKSPACE_STORAGE_KEY);
}

export function setActiveWorkspaceId(workspaceId: string) {
	localStorage.setItem(ACTIVE_WORKSPACE_STORAGE_KEY, workspaceId);
}

export function clearActiveWorkspaceId() {
	localStorage.removeItem(ACTIVE_WORKSPACE_STORAGE_KEY);
}
