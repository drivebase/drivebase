import { Trans } from "@lingui/react/macro";
import {
	type ColumnDef,
	flexRender,
	getCoreRowModel,
	getFilteredRowModel,
	type RowSelectionState,
	useReactTable,
} from "@tanstack/react-table";
import { formatDistanceToNow } from "date-fns";
import { useMemo, useState } from "react";
import {
	PiCaretLeft as ChevronLeft,
	PiCaretRight as ChevronRight,
	PiFunnel as Filter,
	PiTrash as Trash,
	PiX as X,
} from "react-icons/pi";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
	DropdownMenu,
	DropdownMenuCheckboxItem,
	DropdownMenuContent,
	DropdownMenuLabel,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import { confirmDialog } from "@/shared/lib/confirmDialog";
import { type ActivityItem, PAGE_SIZE } from "../hooks/useActivities";

type StatusVariant = "default" | "secondary" | "destructive" | "outline";

function statusVariant(status: string | null | undefined): StatusVariant {
	switch (status) {
		case "success":
			return "default";
		case "error":
			return "destructive";
		case "warning":
			return "outline";
		default:
			return "secondary";
	}
}

function buildColumns(
	onClearOne: (id: string) => void,
): ColumnDef<ActivityItem>[] {
	return [
		{
			id: "select",
			header: ({ table }) => (
				<Checkbox
					checked={
						table.getIsAllPageRowsSelected() ||
						(table.getIsSomePageRowsSelected() && "indeterminate")
					}
					onCheckedChange={(v) => table.toggleAllPageRowsSelected(!!v)}
					aria-label="Select all"
				/>
			),
			cell: ({ row }) => (
				<Checkbox
					checked={row.getIsSelected()}
					onCheckedChange={(v) => row.toggleSelected(!!v)}
					aria-label="Select row"
				/>
			),
			enableSorting: false,
			size: 40,
		},
		{
			accessorKey: "kind",
			header: () => <Trans>Kind</Trans>,
			cell: ({ getValue }) => (
				<Badge variant="outline" className="font-mono text-xs">
					{String(getValue())}
				</Badge>
			),
			size: 140,
		},
		{
			id: "event",
			header: () => <Trans>Event</Trans>,
			cell: ({ row }) => (
				<div className="min-w-0">
					<p className="text-sm font-medium leading-snug truncate">
						{row.original.title}
					</p>
					{row.original.summary ? (
						<p className="text-xs text-muted-foreground truncate mt-0.5">
							{row.original.summary}
						</p>
					) : null}
				</div>
			),
		},
		{
			accessorKey: "status",
			header: () => <Trans>Status</Trans>,
			cell: ({ getValue }) => {
				const val = getValue() as string | null | undefined;
				if (!val)
					return <span className="text-muted-foreground text-xs">—</span>;
				return (
					<Badge variant={statusVariant(val)} className="capitalize">
						{val}
					</Badge>
				);
			},
			size: 100,
		},
		{
			accessorKey: "occurredAt",
			header: () => <Trans>Occurred</Trans>,
			cell: ({ getValue }) => {
				const d = new Date(getValue() as string);
				return (
					<time
						dateTime={d.toISOString()}
						title={d.toLocaleString()}
						className="text-xs text-muted-foreground whitespace-nowrap"
					>
						{formatDistanceToNow(d, { addSuffix: true })}
					</time>
				);
			},
			size: 160,
		},
		{
			id: "actions",
			header: () => null,
			cell: ({ row }) => (
				<Button
					variant="ghost"
					size="icon"
					className="h-7 w-7 text-muted-foreground hover:text-destructive"
					onClick={() => onClearOne(row.original.id)}
				>
					<Trash className="h-4 w-4" />
					<span className="sr-only">
						<Trans>Clear</Trans>
					</span>
				</Button>
			),
			size: 48,
		},
	];
}

interface ActivityTableProps {
	activities: ActivityItem[];
	fetching: boolean;
	page: number;
	hasNextPage: boolean;
	totalPages: number;
	total: number;
	onPageChange: (page: number) => void;
	onClear: (ids: string[]) => Promise<void>;
}

export function ActivityTable({
	activities,
	fetching,
	page,
	hasNextPage,
	totalPages,
	total,
	onPageChange,
	onClear,
}: ActivityTableProps) {
	const [rowSelection, setRowSelection] = useState<RowSelectionState>({});
	const [kindFilter, setKindFilter] = useState<string[]>([]);
	const [statusFilter, setStatusFilter] = useState<string[]>([]);

	// Derive unique kinds and statuses from all data for filter options
	const allKinds = useMemo(
		() => [...new Set(activities.map((a) => a.kind))].sort(),
		[activities],
	);
	const allStatuses = useMemo(
		() =>
			[
				...new Set(activities.map((a) => a.status).filter(Boolean)),
			].sort() as string[],
		[activities],
	);

	const filtered = useMemo(() => {
		return activities.filter((a) => {
			if (kindFilter.length > 0 && !kindFilter.includes(a.kind)) return false;
			if (statusFilter.length > 0 && !statusFilter.includes(a.status ?? ""))
				return false;
			return true;
		});
	}, [activities, kindFilter, statusFilter]);

	const columns = buildColumns(async (id) => {
		const ok = await confirmDialog(
			"Clear activity",
			"Remove this activity entry?",
		);
		if (ok) await onClear([id]);
	});

	const table = useReactTable({
		data: filtered,
		columns,
		getRowId: (row) => row.id,
		getCoreRowModel: getCoreRowModel(),
		getFilteredRowModel: getFilteredRowModel(),
		onRowSelectionChange: setRowSelection,
		state: { rowSelection },
	});

	const selectedIds = Object.keys(rowSelection);
	const hasActiveFilters = kindFilter.length > 0 || statusFilter.length > 0;

	async function handleClearSelected() {
		const ok = await confirmDialog(
			"Clear selected",
			`Remove ${selectedIds.length} activity entries?`,
		);
		if (!ok) return;
		await onClear(selectedIds);
		setRowSelection({});
	}

	async function handleClearAll() {
		const ok = await confirmDialog(
			"Clear all",
			"Remove all visible activity entries?",
		);
		if (!ok) return;
		await onClear(activities.map((a) => a.id));
		setRowSelection({});
	}

	function toggleKind(kind: string) {
		setKindFilter((prev) =>
			prev.includes(kind) ? prev.filter((k) => k !== kind) : [...prev, kind],
		);
	}

	function toggleStatus(status: string) {
		setStatusFilter((prev) =>
			prev.includes(status)
				? prev.filter((s) => s !== status)
				: [...prev, status],
		);
	}

	function clearFilters() {
		setKindFilter([]);
		setStatusFilter([]);
	}

	return (
		<div className="flex flex-col gap-3">
			{/* Toolbar */}
			<div className="flex items-center justify-between gap-2 flex-wrap">
				<div className="flex items-center gap-2">
					{/* Kind filter */}
					<DropdownMenu>
						<DropdownMenuTrigger asChild>
							<Button
								variant={kindFilter.length > 0 ? "secondary" : "outline"}
								size="sm"
								className="gap-1.5"
							>
								<Filter className="h-3.5 w-3.5" />
								<Trans>Kind</Trans>
								{kindFilter.length > 0 && (
									<Badge variant="secondary" className="ml-1 px-1">
										{kindFilter.length}
									</Badge>
								)}
							</Button>
						</DropdownMenuTrigger>
						<DropdownMenuContent align="start" className="w-48">
							<DropdownMenuLabel>
								<Trans>Filter by kind</Trans>
							</DropdownMenuLabel>
							<DropdownMenuSeparator />
							{allKinds.map((kind) => (
								<DropdownMenuCheckboxItem
									key={kind}
									checked={kindFilter.includes(kind)}
									onCheckedChange={() => toggleKind(kind)}
								>
									{kind}
								</DropdownMenuCheckboxItem>
							))}
						</DropdownMenuContent>
					</DropdownMenu>

					{/* Status filter */}
					<DropdownMenu>
						<DropdownMenuTrigger asChild>
							<Button
								variant={statusFilter.length > 0 ? "secondary" : "outline"}
								size="sm"
								className="gap-1.5"
							>
								<Filter className="h-3.5 w-3.5" />
								<Trans>Status</Trans>
								{statusFilter.length > 0 && (
									<Badge variant="secondary" className="ml-1 px-1">
										{statusFilter.length}
									</Badge>
								)}
							</Button>
						</DropdownMenuTrigger>
						<DropdownMenuContent align="start" className="w-48">
							<DropdownMenuLabel>
								<Trans>Filter by status</Trans>
							</DropdownMenuLabel>
							<DropdownMenuSeparator />
							{allStatuses.map((status) => (
								<DropdownMenuCheckboxItem
									key={status}
									checked={statusFilter.includes(status)}
									onCheckedChange={() => toggleStatus(status)}
									className="capitalize"
								>
									{status}
								</DropdownMenuCheckboxItem>
							))}
						</DropdownMenuContent>
					</DropdownMenu>

					{hasActiveFilters && (
						<Button
							variant="ghost"
							size="sm"
							className="gap-1 text-muted-foreground h-8 px-2"
							onClick={clearFilters}
						>
							<X className="h-3.5 w-3.5" />
							<Trans>Clear filters</Trans>
						</Button>
					)}
				</div>

				<div className="flex items-center gap-2">
					{selectedIds.length > 0 && (
						<Button variant="outline" size="sm" onClick={handleClearSelected}>
							<Trash className="h-4 w-4 mr-1.5" />
							<Trans>Clear selected</Trans>
						</Button>
					)}
					{activities.length > 0 && (
						<Button
							variant="ghost"
							size="sm"
							className="text-muted-foreground"
							onClick={handleClearAll}
						>
							<Trans>Clear all</Trans>
						</Button>
					)}
				</div>
			</div>

			{/* Table */}
			<div>
				<Table>
					<TableHeader>
						{table.getHeaderGroups().map((hg) => (
							<TableRow key={hg.id}>
								{hg.headers.map((header) => (
									<TableHead
										key={header.id}
										style={{ width: header.getSize() }}
									>
										{header.isPlaceholder
											? null
											: flexRender(
													header.column.columnDef.header,
													header.getContext(),
												)}
									</TableHead>
								))}
							</TableRow>
						))}
					</TableHeader>
					<TableBody>
						{fetching && activities.length === 0
							? Array.from({ length: PAGE_SIZE }).map((_, i) => (
									// biome-ignore lint/suspicious/noArrayIndexKey: skeleton rows
									<TableRow key={i}>
										{columns.map((_col, j) => (
											// biome-ignore lint/suspicious/noArrayIndexKey: skeleton cells
											<TableCell key={j}>
												<Skeleton className="h-4 w-full" />
											</TableCell>
										))}
									</TableRow>
								))
							: null}

						{!fetching && filtered.length === 0 ? (
							<TableRow>
								<TableCell
									colSpan={columns.length}
									className="h-32 text-center text-muted-foreground text-sm"
								>
									{hasActiveFilters ? (
										<Trans>No results match the current filters.</Trans>
									) : (
										<Trans>No activity yet.</Trans>
									)}
								</TableCell>
							</TableRow>
						) : null}

						{table.getRowModel().rows.map((row) => (
							<TableRow
								key={row.id}
								data-state={row.getIsSelected() ? "selected" : undefined}
							>
								{row.getVisibleCells().map((cell) => (
									<TableCell key={cell.id}>
										{flexRender(cell.column.columnDef.cell, cell.getContext())}
									</TableCell>
								))}
							</TableRow>
						))}
					</TableBody>
				</Table>
			</div>

			{/* Pagination */}
			<div className="flex items-center justify-between">
				<p className="text-sm text-muted-foreground">
					{total === 0 ? (
						<Trans>0 events</Trans>
					) : (
						<Trans>{total} events</Trans>
					)}
				</p>
				<div className="flex items-center gap-1">
					<Button
						variant="ghost"
						size="icon"
						className="h-8 w-8"
						onClick={() => onPageChange(page - 1)}
						disabled={page === 0}
					>
						<ChevronLeft className="h-4 w-4" />
					</Button>
					<span className="text-sm text-muted-foreground px-2">
						<Trans>
							{page + 1} / {totalPages}
						</Trans>
					</span>
					<Button
						variant="ghost"
						size="icon"
						className="h-8 w-8"
						onClick={() => onPageChange(page + 1)}
						disabled={!hasNextPage}
					>
						<ChevronRight className="h-4 w-4" />
					</Button>
				</div>
			</div>
		</div>
	);
}
