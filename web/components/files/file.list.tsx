import { useMutation, useQuery } from '@apollo/client';
import { Link, useRouter, useSearch } from '@tanstack/react-router';
import { ColumnDef, PaginationState } from '@tanstack/react-table';
import {
  DownloadIcon,
  Grid2X2Icon,
  ListIcon,
  PencilIcon,
  StarIcon,
  StarOffIcon,
  TrashIcon,
} from 'lucide-react';
import { Fragment, useCallback, useMemo, useState } from 'react';
import { toast } from 'sonner';

import { File as DBFile } from '@drivebase/sdk';
import { DataTable, FilterParams } from '@drivebase/web/components/common/data.table';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbSeparator,
} from '@drivebase/web/components/ui/breadcrumb';
import { Button } from '@drivebase/web/components/ui/button';
import { Separator } from '@drivebase/web/components/ui/separator';
import { config } from '@drivebase/web/constants/config';
import {
  DELETE_FILE,
  RENAME_FILE,
  STAR_FILE,
  UNSTAR_FILE,
} from '@drivebase/web/gql/mutations/files';
import { GET_FILES } from '@drivebase/web/gql/queries/files';
import { GET_CONNECTED_PROVIDERS } from '@drivebase/web/gql/queries/providers';
import { formatDate, formatFileSize } from '@drivebase/web/lib/utils/format';

import { inputDialog } from '../common/input.dialog';
import ProviderIcon from '../providers/provider.icon';
import { FileIcon } from './file.icon';

type FileListProps = {
  starred?: boolean;
};

function FileList({ starred = false }: FileListProps) {
  const router = useRouter();
  const search = useSearch({ strict: false });
  const parentPath = search.path ?? '/';

  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 100,
  });

  // State for search/filter
  const [searchFilters, setSearchFilters] = useState<FilterParams[]>([]);

  // Build search query string from filters
  const searchQuery = useMemo(() => {
    const nameFilter = searchFilters.find((f) => f.columnId === 'name');
    // Return either the value or undefined (not empty string) to ensure it's properly omitted from query params when empty
    return nameFilter?.value || undefined;
  }, [searchFilters]);

  const { data: providers } = useQuery(GET_CONNECTED_PROVIDERS);
  const { data: files, loading } = useQuery(GET_FILES, {
    variables: {
      input: {
        parentPath,
        isStarred: starred,
        search: searchQuery,
        page: pagination.pageIndex + 1,
        limit: pagination.pageSize,
      },
    },
  });

  const [starFile] = useMutation(STAR_FILE, {
    refetchQueries: [GET_FILES],
  });
  const [unstarFile] = useMutation(UNSTAR_FILE, {
    refetchQueries: [GET_FILES],
  });
  const [renameFile] = useMutation(RENAME_FILE, {
    refetchQueries: [GET_FILES],
  });

  const [deleteFile] = useMutation(DELETE_FILE, {
    refetchQueries: [GET_FILES],
  });

  const splitPath = parentPath.split('/').filter(Boolean);

  const handlePaginationChange = useCallback((newPagination: PaginationState) => {
    setPagination(newPagination);
  }, []);

  // Handle search/filter changes
  const handleFilterChange = useCallback((filters: FilterParams[]) => {
    setSearchFilters(filters);
  }, []);

  const handleDownload = async (file: DBFile) => {
    const fileId = file.id;

    try {
      const loadingToast = toast.loading('Downloading file...');

      const res = await fetch(`${config.apiUrl}/files/download?fileId=${fileId}`);

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

  const handleRename = useCallback(
    (file: DBFile) => {
      const name = file.name;
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
            variables: {
              id: file.id,
              name: res.name,
            },
          })
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
    },
    [renameFile],
  );

  const handleDelete = useCallback(
    (file: DBFile) => {
      const name = file.name;
      inputDialog({
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
      })
        .then((res) => {
          if (res?.name === name) {
            deleteFile({ variables: { id: file.id } })
              .then(() => {
                toast.success('File deleted successfully');
              })
              .catch((err) => {
                console.error(err);
                toast.error('Failed to delete file');
              });
          } else if (res) {
            toast.error('Incorrect name');
          }
        })
        .catch((err) => {
          console.error(err);
          toast.error('Failed to delete file');
        });
    },
    [deleteFile],
  );

  const handleToggleStar = useCallback(
    (file: DBFile) => {
      if (file.isStarred) {
        unstarFile({ variables: { id: file.id } }).catch((err) => {
          console.error(err);
          toast.error('Failed to unstar file');
        });
      } else {
        starFile({ variables: { id: file.id } })
          .then(() => {
            toast.success('File starred successfully');
          })
          .catch((err) => {
            console.error(err);
            toast.error('Failed to star file');
          });
      }
    },
    [starFile, unstarFile],
  );

  const columns = useMemo<ColumnDef<DBFile>[]>(
    () => [
      {
        accessorKey: 'name',
        header: 'Name',
        cell: ({ row }) => {
          const file = row.original;
          return (
            <div className="flex items-center gap-2">
              <FileIcon file={file} size={24} />
              <span>{file.name}</span>
              {file.isStarred && <StarIcon className="h-4 w-4 text-yellow-500" />}
            </div>
          );
        },
      },
      {
        accessorKey: 'size',
        header: 'Size',
        cell: ({ row }) => {
          const file = row.original;
          return file.isFolder ? '-' : formatFileSize(file.size || 0);
        },
      },
      {
        accessorKey: 'updatedAt',
        header: 'Last Modified',
        cell: ({ row }) => {
          return formatDate(row.original.createdAt as Date);
        },
      },
      {
        accessorKey: 'fileProviderId',
        header: 'Provider',
        cell: ({ row }) => {
          const file = row.original;
          const provider = providers?.connectedProviders?.find((p) => p.id === file.providerId);
          if (!provider) return '-';
          return (
            <div className="flex items-center gap-2 capitalize">
              <ProviderIcon provider={provider.type} className="w-5 h-5" />
              {provider.type.replace('_', ' ').toLocaleLowerCase()}
            </div>
          );
        },
      },
      {
        id: 'actions',
        cell: ({ row }) => {
          const file = row.original;
          return (
            <div className="flex justify-end">
              <Button
                variant="ghost"
                size="icon"
                onClick={(e) => {
                  e.stopPropagation();
                  handleToggleStar(file);
                }}
              >
                {file.isStarred ? (
                  <StarOffIcon className="h-4 w-4" />
                ) : (
                  <StarIcon className="h-4 w-4" />
                )}
                <span className="sr-only">{file.isStarred ? 'Unstar' : 'Star'}</span>
              </Button>
              {!file.isFolder && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDownload(file).catch((err) => {
                      console.error(err);
                      toast.error('Failed to download file');
                    });
                  }}
                >
                  <DownloadIcon className="h-4 w-4" />
                  <span className="sr-only">Download</span>
                </Button>
              )}
              <Button
                variant="ghost"
                size="icon"
                onClick={(e) => {
                  e.stopPropagation();
                  handleRename(file);
                }}
              >
                <PencilIcon className="h-4 w-4" />
                <span className="sr-only">Rename</span>
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={(e) => {
                  e.stopPropagation();
                  handleDelete(file);
                }}
              >
                <TrashIcon className="h-4 w-4" />
                <span className="sr-only">Delete</span>
              </Button>
            </div>
          );
        },
      },
    ],
    [handleToggleStar, handleDownload, handleRename, handleDelete],
  );

  // Sort data to ensure folders are always first
  const sortedData = useMemo(() => {
    const fileData = files?.listFiles.data || [];

    // If data is already sorted by the server, we can just return it
    // But we'll do an additional sort as a safety measure
    return [...fileData].sort((a, b) => {
      // Folders first
      if (a.isFolder && !b.isFolder) return -1;
      if (!a.isFolder && b.isFolder) return 1;

      // Then alphabetically by name
      return a.name.localeCompare(b.name);
    });
  }, [files?.listFiles]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="w-full">
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
        <div className="flex items-center gap-2">
          <ListIcon size={20} />
          <Separator orientation="vertical" className="h-4" />
          <Grid2X2Icon size={20} className="text-muted-foreground" />
        </div>
      </div>

      <DataTable
        columns={columns}
        data={sortedData as unknown as DBFile[]}
        paginationMeta={files?.listFiles.meta}
        serverPagination={true}
        onPaginationChange={handlePaginationChange}
        serverFiltering={true}
        onFilterChange={handleFilterChange}
        filterDebounce={500}
        isLoading={loading}
        showSearch={true}
        searchColumn="name"
        searchPlaceholder="Search files..."
        onRowClick={(file) => {
          if (file.isFolder) {
            void router.navigate({
              to: '/',
              search: {
                path: file.path,
              },
            });
          }
        }}
      />
    </div>
  );
}

export default FileList;
