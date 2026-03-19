import { flexRender, type Table as ReactTable } from "@tanstack/react-table";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import type { RowItem } from "../file-system-table/types";
import { DraggableContextRow } from "./TableRow";

interface TableViewProps {
	table: ReactTable<RowItem>;
	emptyColSpan: number;
}

export function TableView({ table, emptyColSpan }: TableViewProps) {
	const filteredRows = table.getRowModel().rows;

	return (
		<div>
			<Table className="w-full" style={{ minWidth: 700 }}>
				<TableHeader>
					{table.getHeaderGroups().map((headerGroup) => (
						<TableRow key={headerGroup.id}>
							{headerGroup.headers.map((header) => (
								<TableHead
									key={header.id}
									style={{
										width: header.getSize(),
										minWidth: header.column.columnDef.minSize,
										maxWidth: header.column.columnDef.maxSize,
									}}
									className={
										header.column.id === "select"
											? "w-11 min-w-11 max-w-11 px-2"
											: undefined
									}
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
					{filteredRows.length ? (
						filteredRows.map((row) => (
							<DraggableContextRow key={row.id} row={row} />
						))
					) : (
						<TableRow>
							<TableCell colSpan={emptyColSpan} className="h-24 text-center">
								This folder is empty
							</TableCell>
						</TableRow>
					)}
				</TableBody>
			</Table>
		</div>
	);
}
