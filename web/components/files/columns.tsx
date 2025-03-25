import { File, Provider } from '@prisma/client';
import { ColumnDef } from '@tanstack/react-table';
import byteSize from 'byte-size';
import { format } from 'date-fns';
import { FolderIcon, StarIcon } from 'lucide-react';
import { Trans } from 'react-i18next';

import ProviderIcon from '../providers/provider.icon';
import { getFileIcon } from './file.icons';

type FileWithProvider = File & {
  fileProvider: Provider;
};

export const columns: ColumnDef<FileWithProvider>[] = [
  {
    accessorKey: 'name',
    header: () => {
      return (
        <div className="w-[300px]">
          <Trans i18nKey="common:name" />
        </div>
      );
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
    header: () => {
      return (
        <div className="w-[100px]">
          <Trans i18nKey="common:size" />
        </div>
      );
    },
    cell: ({ row }) => {
      const size = byteSize(row.original.size || 0);

      return row.original.isFolder ? '-' : `${size.value} ${size.unit}`;
    },
  },
  {
    accessorKey: 'mimeType',
    header: () => {
      return (
        <div className="w-[100px]">
          <Trans i18nKey="common:type" />
        </div>
      );
    },
    cell: ({ row }) => {
      return row.original.isFolder ? 'Folder' : row.original.mimeType;
    },
  },
  {
    accessorKey: 'type',
    header: () => {
      return (
        <div className="w-[100px]">
          <Trans i18nKey="common:provider" />
        </div>
      );
    },
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
      return (
        <div className="w-[100px] text-right">
          <Trans i18nKey="common:created" />
        </div>
      );
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
