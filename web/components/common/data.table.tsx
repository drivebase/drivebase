import {
  ColumnDef,
  ColumnFiltersState,
  PaginationState,
  SortingState,
  VisibilityState,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from '@tanstack/react-table';
import { debounce } from 'lodash';
import { ChevronDown } from 'lucide-react';
import { ReactNode, useCallback, useEffect, useMemo, useState } from 'react';

import { PaginationMeta } from '@drivebase/sdk';
import { Button } from '@drivebase/web/components/ui/button';
import { Checkbox } from '@drivebase/web/components/ui/checkbox';
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@drivebase/web/components/ui/dropdown-menu';
import { Input } from '@drivebase/web/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@drivebase/web/components/ui/table';

export interface FilterParams {
  columnId: string;
  value: string;
}

export interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[];
  data: TData[];
  // Pagination metadata
  paginationMeta?: PaginationMeta;
  showSearch?: boolean;
  searchColumn?: string;
  searchPlaceholder?: string;
  showColumnVisibility?: boolean;
  showPagination?: boolean;
  showSelectedRowCount?: boolean;
  onRowClick?: (row: TData) => void;
  enableRowSelection?: boolean;
  enableSorting?: boolean;
  className?: string;
  tableClassName?: string;
  renderToolbar?: (table: ReturnType<typeof useReactTable<TData>>) => ReactNode;
  // Server-side pagination
  serverPagination?: boolean;
  onPaginationChange?: (pagination: PaginationState) => void;
  // Server-side filtering
  serverFiltering?: boolean;
  onFilterChange?: (filters: FilterParams[]) => void;
  filterDebounce?: number;
  initialFilters?: FilterParams[];
  // Server-side sorting
  serverSorting?: boolean;
  onSortingChange?: (sorting: SortingState) => void;
  isLoading?: boolean;
}

export function DataTable<TData, TValue>({
  columns,
  data,
  paginationMeta,
  showSearch = true,
  searchColumn,
  searchPlaceholder = 'Search...',
  showColumnVisibility = true,
  showPagination = true,
  showSelectedRowCount = true,
  onRowClick,
  enableRowSelection = false,
  enableSorting = true,
  className = '',
  tableClassName = '',
  renderToolbar,
  serverPagination = false,
  onPaginationChange,
  serverFiltering = false,
  onFilterChange,
  filterDebounce = 300,
  initialFilters = [],
  serverSorting = false,
  onSortingChange,
  isLoading = false,
}: DataTableProps<TData, TValue>) {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});
  const [rowSelection, setRowSelection] = useState({});
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: paginationMeta?.page ? paginationMeta.page - 1 : 0,
    pageSize: paginationMeta?.total || 100,
  });
  const [filters, setFilters] = useState<FilterParams[]>(initialFilters);

  // Initialize column filters from initial filters
  useEffect(() => {
    if (initialFilters.length > 0) {
      const initialColumnFilters = initialFilters.map((filter) => ({
        id: filter.columnId,
        value: filter.value,
      }));
      setColumnFilters(initialColumnFilters);
    }
  }, []);

  // Update pagination state when paginationMeta changes
  useEffect(() => {
    if (paginationMeta) {
      setPagination({
        pageIndex: paginationMeta.page ? paginationMeta.page - 1 : 0,
        pageSize: paginationMeta.total || 100,
      });
    }
  }, [paginationMeta]);

  // Handle server-side pagination
  useEffect(() => {
    if (serverPagination && onPaginationChange) {
      onPaginationChange(pagination);
    }
  }, [serverPagination, onPaginationChange, pagination]);

  // Handle server-side sorting
  useEffect(() => {
    if (serverSorting && onSortingChange) {
      onSortingChange(sorting);
    }
  }, [serverSorting, onSortingChange, sorting]);

  // Debounced filter change handler for server-side filtering
  const debouncedFilterChange = useCallback(
    (newFilters: FilterParams[]) => {
      if (serverFiltering && onFilterChange) {
        onFilterChange(newFilters);
      }
    },
    [serverFiltering, onFilterChange],
  );

  // Handle filter changes
  useEffect(() => {
    if (serverFiltering) {
      const handler = debounce(() => {
        debouncedFilterChange(filters);
      }, filterDebounce);

      handler();

      return () => {
        handler.cancel();
      };
    }
  }, [serverFiltering, filters, debouncedFilterChange, filterDebounce]);

  // If enableRowSelection is true, add a select column to the beginning of columns
  const tableColumns = useMemo(() => {
    if (enableRowSelection) {
      return [
        {
          id: 'select',
          header: ({ table }) => (
            <Checkbox
              checked={
                table.getIsAllPageRowsSelected() ||
                (table.getIsSomePageRowsSelected() && 'indeterminate')
              }
              onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
              aria-label="Select all"
            />
          ),
          cell: ({ row }) => (
            <Checkbox
              checked={row.getIsSelected()}
              onCheckedChange={(value) => row.toggleSelected(!!value)}
              aria-label="Select row"
              onClick={(e) => e.stopPropagation()}
            />
          ),
          enableSorting: false,
          enableHiding: false,
        } as ColumnDef<TData, unknown>,
        ...columns,
      ];
    }
    return columns;
  }, [columns, enableRowSelection]);

  // Handle column filter changes
  const handleColumnFilterChange = useCallback(
    (columnId: string, value: string) => {
      if (serverFiltering) {
        // For server-side filtering
        setFilters((prev) => {
          const newFilters = [...prev];
          const existingFilterIndex = newFilters.findIndex((f) => f.columnId === columnId);

          if (value === '') {
            if (existingFilterIndex !== -1) {
              newFilters.splice(existingFilterIndex, 1);
            }
          } else {
            if (existingFilterIndex !== -1) {
              newFilters[existingFilterIndex] = { columnId, value };
            } else {
              newFilters.push({ columnId, value });
            }
          }

          return newFilters;
        });
      } else {
        // For client-side filtering
        setColumnFilters((prev) => {
          if (value === '') {
            return prev.filter((filter) => filter.id !== columnId);
          }

          const exists = prev.find((filter) => filter.id === columnId);
          if (exists) {
            return prev.map((filter) =>
              filter.id === columnId ? { id: columnId, value } : filter,
            );
          }

          return [...prev, { id: columnId, value }];
        });
      }
    },
    [serverFiltering],
  );

  const table = useReactTable({
    data,
    columns: tableColumns,
    pageCount: paginationMeta?.totalPages || 1,
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onPaginationChange: setPagination,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel:
      !serverPagination && showPagination ? getPaginationRowModel() : undefined,
    getSortedRowModel: !serverSorting && enableSorting ? getSortedRowModel() : undefined,
    getFilteredRowModel: !serverFiltering ? getFilteredRowModel() : undefined,
    onColumnVisibilityChange: setColumnVisibility,
    onRowSelectionChange: setRowSelection,
    manualPagination: serverPagination,
    manualFiltering: serverFiltering,
    manualSorting: serverSorting,
    state: {
      sorting,
      columnFilters,
      columnVisibility,
      rowSelection,
      pagination,
    },
  });

  // Generate search input field based on configuration
  const renderSearchInput = () => {
    if (!showSearch || !searchColumn) return null;

    // Get value from either server filters or client column filters
    const searchValue = serverFiltering
      ? filters.find((f) => f.columnId === searchColumn)?.value || ''
      : (table.getColumn(searchColumn)?.getFilterValue() as string) || '';

    return (
      <Input
        placeholder={searchPlaceholder}
        value={searchValue}
        onChange={(event) => {
          const value = event.target.value;
          // Handle empty search input explicitly to ensure filters are properly cleared
          if (value === '') {
            if (serverFiltering) {
              // For server filtering, remove this filter
              setFilters((prev) => prev.filter((f) => f.columnId !== searchColumn));
            } else {
              // For client filtering, clear the column filter
              table.getColumn(searchColumn)?.setFilterValue('');
            }
          } else {
            handleColumnFilterChange(searchColumn, value);
          }
        }}
        className="w-60"
      />
    );
  };

  return (
    <div className={`w-full ${className}`}>
      <div className="flex items-center justify-between py-4">
        <div className="flex items-center gap-2">
          {renderSearchInput()}
          {renderToolbar && renderToolbar(table)}
        </div>
        <div className="flex items-center gap-2">
          {showColumnVisibility && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline">
                  Columns <ChevronDown className="ml-2 h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {table
                  .getAllColumns()
                  .filter((column) => column.getCanHide())
                  .map((column) => {
                    return (
                      <DropdownMenuCheckboxItem
                        key={column.id}
                        className="capitalize"
                        checked={column.getIsVisible()}
                        onCheckedChange={(value) => column.toggleVisibility(!!value)}
                      >
                        {column.id}
                      </DropdownMenuCheckboxItem>
                    );
                  })}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </div>
      <div className={`rounded-md border ${tableClassName}`}>
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => {
                  return (
                    <TableHead key={header.id}>
                      {header.isPlaceholder
                        ? null
                        : flexRender(header.column.columnDef.header, header.getContext())}
                    </TableHead>
                  );
                })}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell
                  colSpan={columns.length + (enableRowSelection ? 1 : 0)}
                  className="h-24 text-center"
                >
                  Loading...
                </TableCell>
              </TableRow>
            ) : table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  data-state={row.getIsSelected() && 'selected'}
                  onClick={() => onRowClick && onRowClick(row.original)}
                  className={onRowClick ? 'cursor-pointer' : ''}
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell
                  colSpan={columns.length + (enableRowSelection ? 1 : 0)}
                  className="h-24 text-center"
                >
                  No results.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
      {showPagination && (
        <div className="flex items-center justify-between space-x-2 py-4">
          <div className="flex-1">
            {showSelectedRowCount && enableRowSelection && (
              <div className="text-sm text-muted-foreground">
                {table.getFilteredSelectedRowModel().rows.length} of{' '}
                {table.getFilteredRowModel().rows.length} row(s) selected.
              </div>
            )}
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            {serverPagination && paginationMeta && (
              <>
                Page {paginationMeta.page} of {paginationMeta.totalPages || 1}
                {' | '}
                Total: {paginationMeta.total} rows
              </>
            )}
          </div>
          <div className="space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => table.previousPage()}
              disabled={!table.getCanPreviousPage()}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => table.nextPage()}
              disabled={!table.getCanNextPage()}
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
