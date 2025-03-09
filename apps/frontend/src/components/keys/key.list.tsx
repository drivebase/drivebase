'use client';

import { Button } from '@drivebase/ui/components/button';
import { Input } from '@drivebase/ui/components/input';
import { Skeleton } from '@drivebase/ui/components/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@drivebase/ui/components/table';
import {
  useSaveKeysMutation,
  useGetKeysQuery,
} from '@drivebase/ui/lib/redux/endpoints/keys';
import {
  useGetAvailableProvidersQuery,
  useGetAuthUrlMutation,
} from '@drivebase/ui/lib/redux/endpoints/providers';
import {
  Dialog,
  DialogTitle,
  DialogHeader,
  DialogContent,
} from '@drivebase/ui/components/dialog';
import Image from 'next/image';
import { ProviderListItem } from '@drivebase/internal/providers/providers';
import { useParams } from 'next/navigation';
import { formatDistance } from 'date-fns';
import { useState } from 'react';

function KeyList() {
  const params = useParams();

  const [keysInput, setKeysInput] = useState<Record<string, string>>({});
  const [selectedProvider, setSelectedProvider] =
    useState<ProviderListItem | null>(null);

  const { data: keys } = useGetKeysQuery({
    workspaceId: params.id as string,
  });
  const { data: providers, isLoading } = useGetAvailableProvidersQuery();
  const [saveKeys, { isLoading: isSaving }] = useSaveKeysMutation();
  const [getAuthUrl, { isLoading: isGettingAuthUrl }] = useGetAuthUrlMutation();
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
            ? Array.from({ length: 3 }).map((_, index) => (
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

            return (
              <TableRow key={provider.type}>
                <TableCell>
                  <div className="flex gap-2 items-center">
                    <Image
                      src={provider.logo}
                      alt={provider.label}
                      width={15}
                      height={15}
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
                          workspaceId: params.id as string,
                          type: provider.type,
                        })
                          .unwrap()
                          .then((res) => {
                            window.location.href = res.data;
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
                  <Image
                    src={selectedProvider.logo}
                    alt={selectedProvider.label}
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
                    <Input
                      placeholder="Client ID"
                      value={keysInput.clientId}
                      onChange={(e) =>
                        setKeysInput({
                          ...keysInput,
                          clientId: e.target.value,
                        })
                      }
                    />
                  </div>
                  <div className="col-span-2">
                    <Input
                      placeholder="Client Secret"
                      value={keysInput.clientSecret}
                      onChange={(e) =>
                        setKeysInput({
                          ...keysInput,
                          clientSecret: e.target.value,
                        })
                      }
                    />
                  </div>
                </div>
                <Button
                  variant="outline"
                  className="w-32"
                  isLoading={isSaving}
                  onClick={() =>
                    saveKeys({
                      keys: keysInput,
                      workspaceId: params.id as string,
                      type: selectedProvider?.type,
                    })
                  }
                >
                  Save
                </Button>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default KeyList;
