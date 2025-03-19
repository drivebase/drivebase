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
import { useGetProvidersQuery } from '@drivebase/react/lib/redux/endpoints/providers';
import {
  Dialog,
  DialogTitle,
  DialogHeader,
  DialogContent,
} from '@drivebase/react/components/dialog';
import { ProviderListItem } from '@drivebase/internal/providers/providers';
import { useState, useRef, useMemo } from 'react';
import { InfoIcon } from 'lucide-react';
import { useGetAuthUrlMutation } from '@drivebase/react/lib/redux/endpoints/providers';
import { getProviderIcon } from '@drivebase/frontend/helpers/provider.icon';
import { CustomProvider } from '../providers';
import ProviderIcon from './provider.icon';
import ConnectProviderDialog from './provider.connect';
import { formatDistance } from 'date-fns';

function ProviderList() {
  const clientIdRef = useRef<HTMLInputElement>(null);
  const clientSecretRef = useRef<HTMLInputElement>(null);

  const [search, setSearch] = useState('');

  const [CustomProvider, setCustomProvider] = useState<
    CustomProvider[keyof CustomProvider] | null
  >(null);

  const [selectedProvider, setSelectedProvider] =
    useState<ProviderListItem | null>(null);

  const { data: providers, isLoading } = useGetProvidersQuery();
  const [getAuthUrl, { isLoading: isGettingAuthUrl }] = useGetAuthUrlMutation();

  const filteredProviders = useMemo(() => {
    return providers?.data.filter((provider) =>
      provider.label.toLowerCase().includes(search.toLowerCase())
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
            <Button variant={'outline'}>Connect Provider</Button>
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
                  <Button size="sm" variant="outline">
                    Disconnect
                  </Button>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>

      {/* OAuth Dialog */}
      <Dialog
        open={!!selectedProvider}
        onOpenChange={(isOpen) => {
          if (!isOpen) {
            setSelectedProvider(null);
          }
        }}
      >
        <DialogContent className="p-0 w-96">
          <DialogHeader className="px-8 py-16">
            <DialogTitle
              asChild
              className="mx-auto text-2xl select-none text-center"
            >
              <div>
                {selectedProvider && (
                  <img
                    src={getProviderIcon(selectedProvider.type)}
                    alt={selectedProvider?.label}
                    width={75}
                    height={75}
                    className="mx-auto mb-4 p-4 bg-muted rounded-xl"
                    draggable={false}
                  />
                )}

                <h1 className="text-2xl font-medium">
                  {selectedProvider?.label}
                </h1>
              </div>
            </DialogTitle>
          </DialogHeader>
          <div className="py-10 px-8 bg-accent/30 border-t">
            {selectedProvider?.authType === 'oauth' && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <Input placeholder="Client ID" ref={clientIdRef} />
                  </div>
                  <div className="col-span-2">
                    <Input placeholder="Client Secret" ref={clientSecretRef} />
                  </div>
                </div>
                <Button
                  variant="outline"
                  className="w-32"
                  isLoading={isGettingAuthUrl}
                  onClick={() => {
                    getAuthUrl({
                      type: selectedProvider.type,
                      clientId: clientIdRef.current?.value,
                      clientSecret: clientSecretRef.current?.value,
                    }).then((res) => {
                      console.log('res', res);
                    });
                  }}
                >
                  Authorize
                </Button>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {CustomProvider && (
        <CustomProvider
          onClose={() => {
            setCustomProvider(null);
          }}
        />
      )}
    </div>
  );
}

export default ProviderList;
