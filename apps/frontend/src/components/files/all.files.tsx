import { useRouter, useSearch, Link } from '@tanstack/react-router';
import { Separator } from '@drivebase/react/components/separator';
import { DownloadIcon, Grid2X2Icon, ListIcon, TrashIcon } from 'lucide-react';
import { useGetFilesQuery } from '@drivebase/react/lib/redux/endpoints/files';
import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
} from '@drivebase/react/components/table';
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
import { Fragment, useMemo } from 'react';
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
  ContextMenuLabel,
} from '@drivebase/react/components/context-menu';
import { toast } from 'sonner';
import type { File as DBFile } from '@prisma/client';

const baseUrl =
  import.meta.env['VITE_PUBLIC_API_URL'] || 'http://localhost:8000';

function AllFiles() {
  const router = useRouter();
  const search = useSearch({ from: '/_protected/_dashboard/' });

  const parentPath = search.path ?? '/';

  const { data, isLoading } = useGetFilesQuery({
    parentPath,
  });

  const splitPath = parentPath.split('/').filter(Boolean);

  const filteredFiles = useMemo(() => {
    const files = Array.from(data?.data ?? []);

    const sortedFiles = files.sort((a, b) => {
      if (a.isFolder && !b.isFolder) return -1;
      if (!a.isFolder && b.isFolder) return 1;
      return 0;
    });

    return sortedFiles;
  }, [data?.data]);

  const table = useReactTable({
    data: filteredFiles,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  const handleDownload = async (file: DBFile) => {
    const fileId = file.id;

    try {
      const loadingToast = toast.loading('Downloading file...');

      const res = await fetch(`${baseUrl}/files/download/${fileId}`, {
        method: 'GET',
        credentials: 'include',
      });

      if (!res.ok) {
        toast.dismiss(loadingToast);
        toast.error(`Failed to download file: ${res.statusText}`);
        return;
      }

      const filename = file.name;

      const blob = await res.blob();

      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();

      window.URL.revokeObjectURL(url);
      a.remove();

      toast.dismiss(loadingToast);
      toast.success(`Downloaded ${filename}`);
    } catch (error) {
      console.error('Download error:', error);
      toast.error('An error occurred while downloading the file');
    }
  };

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
                <Link to="/" params={{ path: '/' }}>
                  root
                </Link>
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            {splitPath.map((path, index) => (
              <Fragment key={path}>
                <BreadcrumbItem>
                  <BreadcrumbLink asChild>
                    <Link to="/" params={{ path: '/' + path }}>
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
                      router.navigate({
                        to: '/',
                        search: {
                          path: row.original.path,
                        },
                      });
                    }
                  }}
                  className="select-none"
                >
                  {row.getVisibleCells().map((cell) => (
                    <ContextMenu key={cell.id}>
                      <ContextMenuTrigger asChild>
                        <TableCell>
                          {flexRender(
                            cell.column.columnDef.cell,
                            cell.getContext()
                          )}
                        </TableCell>
                      </ContextMenuTrigger>
                      <ContextMenuContent className="w-[200px]">
                        <ContextMenuLabel>Actions</ContextMenuLabel>
                        <ContextMenuItem
                          disabled={row.original.isFolder}
                          onClick={() => handleDownload(row.original)}
                        >
                          <DownloadIcon className="w-4 h-4 mr-2" />
                          Download
                        </ContextMenuItem>
                        <ContextMenuItem>
                          <TrashIcon className="w-4 h-4 mr-2" />
                          Delete
                        </ContextMenuItem>
                      </ContextMenuContent>
                    </ContextMenu>
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
