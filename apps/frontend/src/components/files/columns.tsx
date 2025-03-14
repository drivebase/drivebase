'use client';

import { File } from '@prisma/client';
import { ColumnDef } from '@tanstack/react-table';
import { FolderIcon } from 'lucide-react';
import byteSize from 'byte-size';
import { getFileIcon } from './file.icons';
import { format } from 'date-fns';
import { getProviderIcon } from '@drivebase/frontend/helpers/provider.icon';
import Image from 'next/image';

export const columns: ColumnDef<File>[] = [
  {
    accessorKey: 'name',
    header: () => {
      return <div>Name</div>;
    },
    cell: ({ row }) => {
      const Icon = row.original.isFolder
        ? FolderIcon
        : getFileIcon(row.original.name);

      return (
        <div className="flex items-center gap-2">
          <Icon size={20} />
          {row.original.name}
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
      if (!row.original.provider) return '-';

      const Icon = getProviderIcon(row.original.provider);

      return (
        <div className="flex items-center gap-2 capitalize">
          <Image
            src={Icon}
            alt={row.original.provider || ''}
            width={20}
            height={20}
          />
          {row.original.provider?.replace('_', ' ').toLocaleLowerCase()}
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
