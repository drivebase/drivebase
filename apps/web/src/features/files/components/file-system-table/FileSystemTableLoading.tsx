import { Skeleton } from "@/components/ui/skeleton";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";

interface FileSystemTableLoadingProps {
	showSharedColumn?: boolean;
	rowCount?: number;
}

export function FileSystemTableLoading({
	showSharedColumn = false,
	rowCount = 6,
}: FileSystemTableLoadingProps) {
	return (
		<Table>
			<TableHeader>
				<TableRow>
					<TableHead className="w-10" />
					<TableHead className="w-[360px]">Name</TableHead>
					<TableHead>Size</TableHead>
					<TableHead>Provider</TableHead>
					<TableHead>Type</TableHead>
					{showSharedColumn ? <TableHead>Shared</TableHead> : null}
					<TableHead className="text-right">Last Modified</TableHead>
					<TableHead className="w-[50px]" />
				</TableRow>
			</TableHeader>
			<TableBody>
				{Array.from({ length: rowCount }).map((_, i) => (
					<TableRow
						// biome-ignore lint/suspicious/noArrayIndexKey: skeleton loading
						key={i}
					>
						<TableCell>
							<Skeleton className="h-4 w-4" />
						</TableCell>
						<TableCell>
							<Skeleton className="h-4 w-56" />
						</TableCell>
						<TableCell>
							<Skeleton className="h-4 w-16" />
						</TableCell>
						<TableCell>
							<Skeleton className="h-4 w-24" />
						</TableCell>
						<TableCell>
							<Skeleton className="h-4 w-20" />
						</TableCell>
						{showSharedColumn ? (
							<TableCell>
								<Skeleton className="h-4 w-16" />
							</TableCell>
						) : null}
						<TableCell className="text-right">
							<Skeleton className="h-4 w-24 ml-auto" />
						</TableCell>
						<TableCell>
							<Skeleton className="h-8 w-8  ml-auto" />
						</TableCell>
					</TableRow>
				))}
			</TableBody>
		</Table>
	);
}
