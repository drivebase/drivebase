'use client';

import { Separator } from '@drivebase/react/components/separator';
import { Grid2X2Icon, ListIcon } from 'lucide-react';
import { useGetFilesQuery } from '@drivebase/react/lib/redux/endpoints/files';
import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
} from '@drivebase/react/components/table';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  flexRender,
  getCoreRowModel,
  useReactTable,
} from '@tanstack/react-table';
import { columns } from './columns';
import { Skeleton } from '@drivebase/react/components/skeleton';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbSeparator,
} from '@drivebase/react/components/breadcrumb';
import { Fragment } from 'react';
import Link from 'next/link';

function AllFiles() {
  const router = useRouter();

  const searchParams = useSearchParams();

  const parentPath = searchParams.get('path') ?? '/';

  const { data, isLoading } = useGetFilesQuery({
    parentPath,
  });

  const table = useReactTable({
    data: data?.data ?? [],
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  const splitPath = parentPath.split('/').filter(Boolean);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-medium">All Files</h1>
        <div className="flex items-center gap-2">
          <ListIcon size={20} />
          <Separator orientation="vertical" className="h-4" />
          <Grid2X2Icon size={20} className="text-muted-foreground" />
        </div>
      </div>

      <div>
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink asChild>
                <Link href={`/?path=%2F`}>root</Link>
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            {splitPath.map((path, index) => (
              <Fragment key={path}>
                <BreadcrumbItem>
                  <BreadcrumbLink asChild>
                    <Link href={`/?path=${encodeURIComponent('/' + path)}`}>
                      {path ?? '/'}
                    </Link>
                  </BreadcrumbLink>
                </BreadcrumbItem>
                {index !== splitPath.length - 1 && <BreadcrumbSeparator />}
              </Fragment>
            ))}
          </BreadcrumbList>
        </Breadcrumb>
      </div>

      {isLoading ? (
        <div className="flex flex-col gap-4">
          {new Array(10).fill(0).map((_, index) => (
            <Skeleton key={index} className="w-full h-12" />
          ))}
        </div>
      ) : (
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => {
                  return (
                    <TableHead key={header.id}>
                      {header.isPlaceholder
                        ? null
                        : flexRender(
                            header.column.columnDef.header,
                            header.getContext()
                          )}
                    </TableHead>
                  );
                })}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  data-state={row.getIsSelected() && 'selected'}
                  onDoubleClick={() => {
                    if (row.original.isFolder) {
                      router.push(
                        `/?path=${encodeURIComponent(row.original.path)}`
                      );
                    }
                  }}
                  className="select-none"
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext()
                      )}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow className="hover:bg-transparent">
                <TableCell
                  colSpan={columns.length}
                  className="h-24 text-center"
                >
                  No results.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      )}

      <div>
        {/* <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[400px]">Name</TableHead>
              <TableHead>Size</TableHead>
              <TableHead>Type</TableHead>
              <TableHead className="text-right">Created</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading &&
              new Array(10).fill(0).map((_, index) => (
                <TableRow key={index}>
                  <TableCell colSpan={5}>
                    <Skeleton className="w-full h-6" />
                  </TableCell>
                </TableRow>
              ))}

            {data?.data?.map((file) => {
              const size = byteSize(file.size || 0);
              const Icon = file.isFolder
                ? getFolderIcon()
                : getFileIcon(file.name);

              return (
                <TableRow
                  key={file.id}
                  onDoubleClick={() => {
                    router.push(`/?parentId=${file.id}`);
                  }}
                >
                  <TableCell className="flex items-center gap-2">
                    <Icon className="w-4 h-4" />
                    {file.name}
                  </TableCell>
                  <TableCell>
                    {file.isFolder ? '-' : `${size.value} ${size.unit}`}
                  </TableCell>
                  <TableCell>{file.mimeType || 'Folder'}</TableCell>
                  <TableCell className="text-right">
                    {format(file.createdAt, 'MMM dd, yyyy')} at{' '}
                    {format(file.createdAt, 'HH:mm')}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table> */}
      </div>

      {/* <div className="flex flex-wrap gap-4">
        {isLoading &&
          new Array(10)
            .fill(0)
            .map((_, index) => (
              <Skeleton key={index} className="w-40 aspect-square" />
            ))}
        {data?.data?.map((file) => {
          const Icon = file.isFolder ? getFolderIcon() : getFileIcon(file.name);

          return (
            <div
              key={file.id}
              className="relative rounded-md w-32 aspect-square select-none"
            >
              <Icon className="w-full h-full" />

              <div className="px-2 space-y-1">
                <div className="text-sm">{file.name}</div>
                <div className="text-xs text-muted-foreground">2.3 MB</div>
              </div>
            </div>
          );
        })}
      </div> */}
    </div>
  );
}

export default AllFiles;
