import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbSeparator,
} from '@drivebase/web/components/ui/breadcrumb';
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuLabel,
  ContextMenuTrigger,
} from '@drivebase/web/components/ui/context-menu';
import { DropdownMenuSeparator } from '@drivebase/web/components/ui/dropdown-menu';
import { Input } from '@drivebase/web/components/ui/input';
import { Separator } from '@drivebase/web/components/ui/separator';
import { Skeleton } from '@drivebase/web/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@drivebase/web/components/ui/table';
import {
  useDeleteFileMutation,
  useGetFilesQuery,
  useRenameFileMutation,
  useStarFileMutation,
  useUnstarFileMutation,
} from '@drivebase/web/lib/redux/endpoints/files';
import type { File as DBFile } from '@prisma/client';
import { Link, useRouter, useSearch } from '@tanstack/react-router';
import {
  flexRender,
  getCoreRowModel,
  useReactTable,
} from '@tanstack/react-table';
import {
  DownloadIcon,
  Grid2X2Icon,
  InfoIcon,
  ListIcon,
  MoveIcon,
  PencilIcon,
  StarIcon,
  StarOffIcon,
  TrashIcon,
} from 'lucide-react';
import { Fragment, useMemo } from 'react';
import { toast } from 'sonner';

import { inputDialog } from '../common/input.dialog';
import { columns } from './columns';

const baseUrl = import.meta.env['VITE_PUBLIC_API_URL'] || '/api';

type FileListProps = {
  starred?: boolean;
};

function FileList({ starred = false }: FileListProps) {
  const router = useRouter();
  const search = useSearch({ strict: false });

  const parentPath = search.path ?? '/';

  const { data, isLoading } = useGetFilesQuery({
    parentPath,
    isStarred: starred,
  });

  const [starFile] = useStarFileMutation();
  const [unstarFile] = useUnstarFileMutation();
  const [deleteFile] = useDeleteFileMutation();
  const [renameFile] = useRenameFileMutation();

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
        <Input placeholder="Search" className="w-[300px]" />
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
                <Link to="/" search={{ path: '/' }}>
                  root
                </Link>
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            {splitPath.map((path, index) => {
              const updatedPath = '/' + splitPath.slice(0, index + 1).join('/');

              return (
                <Fragment key={path}>
                  <BreadcrumbItem>
                    <BreadcrumbLink asChild>
                      <Link to="/" search={{ path: updatedPath }}>
                        {path ?? '/'}
                      </Link>
                    </BreadcrumbLink>
                  </BreadcrumbItem>
                  {index !== splitPath.length - 1 && <BreadcrumbSeparator />}
                </Fragment>
              );
            })}
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
                            header.getContext(),
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
                            cell.getContext(),
                          )}
                        </TableCell>
                      </ContextMenuTrigger>
                      <ContextMenuContent className="w-[200px]">
                        <ContextMenuLabel>{row.original.name}</ContextMenuLabel>
                        <DropdownMenuSeparator />
                        <ContextMenuItem>
                          <InfoIcon className="w-4 h-4 mr-2" />
                          File info
                        </ContextMenuItem>
                        <ContextMenuItem
                          disabled={row.original.isFolder}
                          onClick={() => {
                            handleDownload(row.original).catch((err) => {
                              console.error(err);
                              toast.error('Failed to download file');
                            });
                          }}
                        >
                          <DownloadIcon className="w-4 h-4 mr-2" />
                          Download
                        </ContextMenuItem>
                        <DropdownMenuSeparator />
                        <ContextMenuItem
                          // eslint-disable-next-line @typescript-eslint/no-misused-promises
                          onClick={async () => {
                            const name = row.original.name;
                            const res = await inputDialog({
                              title: `Are you sure?`,
                              description: 'This action cannot be undone.',
                              icon: TrashIcon,
                              inputFields: [
                                {
                                  label: `To confirm, type "${name}"`,
                                  name: 'name',
                                  type: 'text',
                                  placeholder: '',
                                },
                              ],
                            });
                            if (res?.name === name) {
                              deleteFile(row.original.id)
                                .unwrap()
                                .then(() => {
                                  toast.success('File deleted successfully');
                                })
                                .catch((err) => {
                                  console.error(err);
                                  toast.error('Failed to delete file');
                                });
                            } else {
                              toast.error('Incorrect name');
                            }
                          }}
                        >
                          <TrashIcon className="w-4 h-4 mr-2" />
                          Delete
                        </ContextMenuItem>
                        <ContextMenuItem
                          onClick={() => {
                            const name = row.original.name;
                            inputDialog({
                              title: `Rename`,
                              description: 'Enter the new name for the file',
                              icon: PencilIcon,
                              inputFields: [
                                {
                                  label: `Enter new name`,
                                  name: 'name',
                                  type: 'text',
                                  defaultValue: name,
                                },
                              ],
                            })
                              .then((res) => {
                                if (!res?.name) {
                                  toast.error('Invalid name');
                                  return;
                                }
                                renameFile({
                                  id: row.original.id,
                                  name: res.name,
                                })
                                  .unwrap()
                                  .then(() => {
                                    toast.success('File renamed successfully');
                                  })
                                  .catch((err) => {
                                    console.error(err);
                                    toast.error('Failed to rename file');
                                  });
                              })
                              .catch((err) => {
                                console.error(err);
                                toast.error('Failed to rename file');
                              });
                          }}
                        >
                          <PencilIcon className="w-4 h-4 mr-2" />
                          Rename
                        </ContextMenuItem>
                        <ContextMenuItem>
                          <MoveIcon className="w-4 h-4 mr-2" />
                          Move
                        </ContextMenuItem>
                        <DropdownMenuSeparator />
                        <ContextMenuItem
                          onClick={() => {
                            if (row.original.isStarred) {
                              unstarFile(row.original.id)
                                .unwrap()
                                .catch((err) => {
                                  console.error(err);
                                  toast.error('Failed to unstar file');
                                });
                            } else {
                              starFile(row.original.id)
                                .unwrap()
                                .then(() => {
                                  toast.success('File starred successfully');
                                })
                                .catch((err) => {
                                  console.error(err);
                                  toast.error('Failed to star file');
                                });
                            }
                          }}
                        >
                          {row.original.isStarred ? (
                            <StarOffIcon className="w-4 h-4 mr-2" />
                          ) : (
                            <StarIcon className="w-4 h-4 mr-2" />
                          )}
                          {row.original.isStarred
                            ? 'Remove from starred'
                            : 'Add to starred'}
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
    </div>
  );
}

export default FileList;
