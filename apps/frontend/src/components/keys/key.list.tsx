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
import {
  useSaveKeysMutation,
  useGetKeysQuery,
} from '@drivebase/react/lib/redux/endpoints/keys';
import { useGetAvailableProvidersQuery } from '@drivebase/react/lib/redux/endpoints/providers';
import {
  Dialog,
  DialogTitle,
  DialogHeader,
  DialogContent,
} from '@drivebase/react/components/dialog';
import { ProviderListItem } from '@drivebase/internal/providers/providers';
import { formatDistance } from 'date-fns';
import { useState, useRef } from 'react';
import { useGetAuthUrlMutation } from '@drivebase/react/lib/redux/endpoints/accounts';
import { getProviderIcon } from '@drivebase/frontend/helpers/provider.icon';
import { toast } from 'sonner';
import { ProviderType } from '@prisma/client';
import { CustomProvider, CustomProviders } from '../providers';

function KeyList() {
  const clientIdRef = useRef<HTMLInputElement>(null);
  const clientSecretRef = useRef<HTMLInputElement>(null);

  const [CustomProvider, setCustomProvider] = useState<
    CustomProvider[keyof CustomProvider] | null
  >(null);

  const [selectedProvider, setSelectedProvider] =
    useState<ProviderListItem | null>(null);

  const { data: keys } = useGetKeysQuery();
  const { data: providers, isLoading } = useGetAvailableProvidersQuery();
  const [saveKeys, { isLoading: isSaving }] = useSaveKeysMutation();
  const [getAuthUrl, { isLoading: isGettingAuthUrl }] = useGetAuthUrlMutation();

  function handleSave() {
    const clientId = clientIdRef.current?.value;
    const clientSecret = clientSecretRef.current?.value;

    if (!clientId || !clientSecret) {
      toast.error('Please fill in all fields');
      return;
    }

    if (!selectedProvider) {
      toast.error('Please select a provider');
      return;
    }

    saveKeys({
      keys: {
        clientId,
        clientSecret,
      },
      type: selectedProvider.type,
    })
      .unwrap()
      .then(() => {
        toast.success('Keys saved');
        setSelectedProvider(null);
      })
      .catch((err) => {
        console.error(err);
        toast.error('Failed to save keys');
      });
  }

  return (
    <div className="space-y-4">
      <Input placeholder="Search" className="w-60" />
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Provider</TableHead>
            <TableHead className="w-72">Last updated</TableHead>
            <TableHead className="text-right w-72">Action</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {isLoading
            ? Array.from({ length: 6 }).map((_, index) => (
                <TableRow key={index}>
                  <TableCell colSpan={3}>
                    <Skeleton className="h-10 w-full" />
                  </TableCell>
                </TableRow>
              ))
            : null}
          {providers?.data?.map((provider) => {
            const isSetup = keys?.data.find(
              (key) => key.type === provider.type
            );

            const iconUrl = getProviderIcon(provider.type);

            return (
              <TableRow key={provider.type}>
                <TableCell>
                  <div className="flex gap-2 items-center">
                    <img
                      src={iconUrl}
                      alt={provider.label}
                      width={20}
                      height={20}
                      className="rounded"
                    />
                    {provider.label}
                  </div>
                </TableCell>
                <TableCell
                  title={
                    isSetup?.updatedAt
                      ? new Date(isSetup.updatedAt).toLocaleString()
                      : ''
                  }
                >
                  {isSetup?.updatedAt
                    ? formatDistance(new Date(isSetup.updatedAt), new Date(), {
                        addSuffix: true,
                      })
                    : '-'}
                </TableCell>
                <TableCell className="gap-2 flex items-center justify-end">
                  {!!isSetup && (
                    <Button
                      size="sm"
                      variant="outline"
                      isLoading={isGettingAuthUrl}
                      onClick={() => {
                        getAuthUrl({
                          type: provider.type,
                        })
                          .unwrap()
                          .then((res) => {
                            if (res.data.startsWith('custom://')) {
                              const provider = res.data.split('://')[1];
                              if (provider in CustomProviders) {
                                const Provider =
                                  CustomProviders[provider as ProviderType];
                                if (Provider) {
                                  setCustomProvider(Provider);
                                }
                              }
                            } else {
                              window.location.href = res.data;
                            }
                          })
                          .catch((err) => {
                            console.error(err);
                          });
                      }}
                    >
                      Connect
                    </Button>
                  )}
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setSelectedProvider(provider)}
                  >
                    Edit
                  </Button>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>

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
          <div className="py-10 px-8 bg-accent/30  border-t">
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
                  isLoading={isSaving}
                  onClick={handleSave}
                >
                  Save
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

export default KeyList;
