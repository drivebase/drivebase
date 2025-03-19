import { File, Provider } from '@prisma/client';
import { ColumnDef } from '@tanstack/react-table';
import { FolderIcon, StarOffIcon, StarIcon } from 'lucide-react';
import byteSize from 'byte-size';
import { getFileIcon } from './file.icons';
import { format } from 'date-fns';
import ProviderIcon from '../providers/provider.icon';

type FileWithProvider = File & {
  fileProvider: Provider;
};

export const columns: ColumnDef<FileWithProvider>[] = [
  {
    accessorKey: 'name',
    header: () => {
      return <div className="w-[300px]">Name</div>;
    },
    cell: ({ row }) => {
      const Icon = row.original.isFolder
        ? FolderIcon
        : getFileIcon(row.original.name);

      return (
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Icon size={20} />
            {row.original.name}
          </div>
          {row.original.isStarred && <StarIcon className="w-4 h-4" />}
        </div>
      );
    },
  },
  {
    accessorKey: 'size',
    header: 'Size',
    cell: ({ row }) => {
      const size = byteSize(row.original.size || 0);

      return row.original.isFolder ? '-' : `${size.value} ${size.unit}`;
    },
  },
  {
    accessorKey: 'mimeType',
    header: 'Type',
    cell: ({ row }) => {
      return row.original.isFolder ? 'Folder' : row.original.mimeType;
    },
  },
  {
    accessorKey: 'type',
    header: 'Provider',
    cell: ({ row }) => {
      if (!row.original.fileProviderId) return '-';
      const provider = row.original.fileProvider;

      return (
        <div className="flex items-center gap-2 capitalize">
          <ProviderIcon provider={provider.type} className="w-5 h-5" />
          {provider.type.replace('_', ' ').toLocaleLowerCase()}
        </div>
      );
    },
  },
  {
    accessorKey: 'createdAt',
    header: () => {
      return <div className="text-right">Created</div>;
    },
    cell: ({ row }) => {
      const date = format(row.original.createdAt, 'MMM dd, yyyy');
      const time = format(row.original.createdAt, 'HH:mm');

      return (
        <div className="text-right">
          {date} at {time}
        </div>
      );
    },
  },
];
