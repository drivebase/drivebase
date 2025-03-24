import { Button } from '@drivebase/react/components/button';
import { Input } from '@drivebase/react/components/input';
import { Skeleton } from '@drivebase/react/components/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@drivebase/react/components/table';
import { useGetProvidersQuery } from '@drivebase/react/redux/endpoints/providers';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@drivebase/react/components/sheet';
import { useState, useMemo } from 'react';
import { InfoIcon, Link2Icon } from 'lucide-react';
import ProviderIcon from './provider.icon';
import ConnectProviderDialog from './provider.connect';
import { formatDistance } from 'date-fns';
import { Provider } from '@prisma/client';
import ConfigureProvider from './provider.configure';

function ProviderList() {
  const [search, setSearch] = useState('');
  const [configureProvider, setConfigureProvider] = useState<Provider | null>(
    null,
  );

  const { data: providers, isLoading } = useGetProvidersQuery();

  const filteredProviders = useMemo(() => {
    return providers?.data.filter((provider) =>
      provider.label.toLowerCase().includes(search.toLowerCase()),
    );
  }, [providers, search]);

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
          {isLoading
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
              <TableRow key={provider.type}>
                <TableCell>
                  <ProviderIcon provider={provider.type} />
                </TableCell>
                <TableCell>{provider.label}</TableCell>
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
                      setConfigureProvider(provider);
                    }}
                  >
                    Configure
                  </Button>
                  <Button size="sm" variant="outline">
                    Disconnect
                  </Button>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>

      <Sheet
        open={!!configureProvider}
        onOpenChange={(isOpen) => {
          if (!isOpen) {
            setConfigureProvider(null);
          }
        }}
      >
        <SheetContent
          onInteractOutside={(e) => {
            e.preventDefault();
          }}
          className="min-w-[40rem]"
        >
          <SheetHeader>
            <SheetTitle>Configure Provider</SheetTitle>
          </SheetHeader>
          <div className="mt-6">
            {configureProvider && (
              <ConfigureProvider provider={configureProvider} />
            )}
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}

export default ProviderList;
