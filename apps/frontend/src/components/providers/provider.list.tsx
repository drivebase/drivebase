'use client';

import { Input } from '@drivebase/react/components/input';
import { Button } from '@drivebase/react/components/button';
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@drivebase/react/components/table';

import { CloudIcon } from 'lucide-react';
import React from 'react';
import Link from 'next/link';

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

function ProviderList() {
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

  return (
    <div className="space-y-4">
      <Input placeholder="Search" className="w-60" />
      <Table>
        <TableCaption>A list of your recent invoices.</TableCaption>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[100px]">Invoice</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Method</TableHead>
            <TableHead className="text-right">Amount</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          <TableRow>
            <TableCell className="font-medium">INV001</TableCell>
            <TableCell>Paid</TableCell>
            <TableCell>Credit Card</TableCell>
            <TableCell className="text-right">$250.00</TableCell>
          </TableRow>
        </TableBody>
      </Table>
    </div>
  );
}

export default ProviderList;
