import { useQuery } from '@apollo/client';
import { formatDistance } from 'date-fns';
import { InfoIcon, Link2Icon } from 'lucide-react';
import { useMemo, useState } from 'react';

import { Button } from '@drivebase/web/components/ui/button';
import { Input } from '@drivebase/web/components/ui/input';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@drivebase/web/components/ui/sheet';
import { Skeleton } from '@drivebase/web/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@drivebase/web/components/ui/table';
import { GET_CONNECTED_PROVIDERS } from '@drivebase/web/gql/queries/providers';

import ConfigureProvider from './provider.configure';
import ConnectProviderDialog from './provider.connect';
import ProviderIcon from './provider.icon';

function ProviderList() {
  const [search, setSearch] = useState('');
  const [configureProviderId, setConfigureProviderId] = useState<string | null>(null);

  const { data: providers, loading } = useQuery(GET_CONNECTED_PROVIDERS);

  const filteredProviders = useMemo(() => {
    return providers?.connectedProviders.filter((provider) =>
      provider.name.toLowerCase().includes(search.toLowerCase()),
    );
  }, [providers, search]);

  const configureProvider = useMemo(() => {
    return filteredProviders?.find((provider) => provider.id === configureProviderId);
  }, [filteredProviders, configureProviderId]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Input
          placeholder="Search"
          className="w-60"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <div className="flex gap-2">
          <ConnectProviderDialog>
            <Button variant={'outline'}>
              <Link2Icon />
              Connect Provider
            </Button>
          </ConnectProviderDialog>
          <a
            href="https://drivebase.github.io/docs/providers"
            target="_blank"
            rel="noopener noreferrer"
          >
            <Button variant={'outline'}>
              <InfoIcon />
              Learn More
            </Button>
          </a>
        </div>
      </div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-14" />
            <TableHead>Label</TableHead>
            <TableHead className="w-72">Connected At</TableHead>
            <TableHead className="text-right w-72">Action</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {loading
            ? Array.from({ length: 6 }).map((_, index) => (
                <TableRow key={index}>
                  <TableCell colSpan={4}>
                    <Skeleton className="h-10 w-full" />
                  </TableCell>
                </TableRow>
              ))
            : null}
          {filteredProviders?.map((provider) => {
            return (
              <TableRow key={provider.id}>
                <TableCell>
                  <ProviderIcon provider={provider.type} />
                </TableCell>
                <TableCell>{provider.name}</TableCell>
                <TableCell>
                  {formatDistance(new Date(provider.createdAt), new Date(), {
                    addSuffix: true,
                  })}
                </TableCell>
                <TableCell className="gap-2 flex items-center justify-end">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setConfigureProviderId(provider.id);
                    }}
                  >
                    Manage
                  </Button>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>

      <Sheet
        open={!!configureProviderId}
        onOpenChange={(isOpen) => {
          if (!isOpen) {
            setConfigureProviderId(null);
          }
        }}
      >
        <SheetContent
          onInteractOutside={(e) => {
            e.preventDefault();
          }}
          className="min-w-[40rem] overflow-auto"
        >
          <SheetHeader>
            <SheetTitle>{configureProvider?.name}</SheetTitle>
          </SheetHeader>
          <div className="mt-6">
            {configureProvider && (
              <ConfigureProvider
                id={configureProvider.id}
                name={configureProvider.name}
                type={configureProvider.type}
                authType={configureProvider.authType}
                metadata={configureProvider.metadata as unknown as Record<string, unknown>}
              />
            )}
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}

export default ProviderList;
