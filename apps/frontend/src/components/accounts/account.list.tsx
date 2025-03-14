'use client';

import { Input } from '@drivebase/react/components/input';
import { Button } from '@drivebase/react/components/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@drivebase/react/components/table';
import { CloudIcon } from 'lucide-react';
import React from 'react';
import Link from 'next/link';
import { useGetConnectedAccountsQuery } from '@drivebase/react/lib/redux/endpoints/accounts';
import { Skeleton } from '@drivebase/react/components/skeleton';
import { useGetAvailableProvidersQuery } from '@drivebase/react/lib/redux/endpoints/providers';
import Image from 'next/image';
import { formatDistance } from 'date-fns';
import { getProviderIcon } from '@drivebase/frontend/helpers/provider.icon';

type NoDataProps = {
  title: string;
  description: string;
  button?: React.ReactNode;
};

function NoData({ title, description, button }: NoDataProps) {
  return (
    <div className="flex h-96 flex-col items-center justify-center gap-4 rounded-xl border p-4">
      <CloudIcon className="h-14 w-14" />
      <div className="text-center">
        <h1 className="font-medium">{title}</h1>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
      {button}
    </div>
  );
}

function AccountList() {
  const { data: providers, isLoading: isLoadingProviders } =
    useGetAvailableProvidersQuery();
  const { data: accounts, isLoading: isLoadingAccounts } =
    useGetConnectedAccountsQuery();

  const isLoading = isLoadingProviders || isLoadingAccounts;

  if (accounts?.data.length === 0 && !isLoading) {
    return (
      <NoData
        title="No accounts found"
        description="You haven't linked any accounts yet."
        button={
          <Link href="/settings/keys">
            <Button variant={'outline'}>Link Account</Button>
          </Link>
        }
      />
    );
  }

  return (
    <div className="space-y-4">
      <Input placeholder="Search" className="w-60" />
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-52">Provider</TableHead>
            <TableHead className="w-52">Alias</TableHead>
            <TableHead>Connected</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {isLoading
            ? Array.from({ length: 6 }).map((_, index) => (
                <TableRow key={index}>
                  <TableCell colSpan={4}>
                    <Skeleton className="h-10 w-full" />
                  </TableCell>
                </TableRow>
              ))
            : null}

          {accounts?.data.map((account) => {
            const provider = providers?.data.find(
              (provider) => provider.type === account.type
            );

            const iconUrl = getProviderIcon(account.type);

            return (
              <TableRow key={account.id}>
                <TableCell>
                  <div className="flex items-center gap-2">
                    {provider && (
                      <Image
                        src={iconUrl}
                        alt={provider.label || ''}
                        width={20}
                        height={20}
                      />
                    )}
                    <span>{provider?.label || ''}</span>
                  </div>
                </TableCell>
                <TableCell>{account.alias || 'No alias'}</TableCell>
                <TableCell>
                  {formatDistance(account.createdAt, new Date(), {
                    addSuffix: true,
                  })}
                </TableCell>
                <TableCell className="text-right">
                  <Button size="sm" variant={'outline'}>
                    Disconnect
                  </Button>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}

export default AccountList;
