import { useApolloClient, useMutation, useQuery } from '@apollo/client';
import { useSearch } from '@tanstack/react-router';
import byteSize from 'byte-size';
import { FileIcon, XIcon } from 'lucide-react';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';

import { Button } from '@drivebase/web/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@drivebase/web/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@drivebase/web/components/ui/select';
import { config } from '@drivebase/web/constants/config';
import { GENERATE_UPLOAD_KEY } from '@drivebase/web/gql/mutations/files';
import { GET_FILES } from '@drivebase/web/gql/queries/files';
import { GET_CONNECTED_PROVIDERS } from '@drivebase/web/gql/queries/providers';
import { getProviderIcon } from '@drivebase/web/helpers/provider.icon';
import { useFileStore } from '@drivebase/web/lib/contexts/file-store.context';
import { useUploadStore } from '@drivebase/web/lib/store/upload.store';

export function UploadModal() {
  const client = useApolloClient();
  const search = useSearch({ strict: false });

  const { uploadModalOpen, setUploadModalOpen, clearFileIds } = useUploadStore();
  const { files, clearFiles, removeFile } = useFileStore();

  const [uploading, setUploading] = useState(false);
  const [selectedProvider, setSelectedProvider] = useState<string | null>(null);

  const { data: connectedProviders } = useQuery(GET_CONNECTED_PROVIDERS);
  const [createUploadKey, { loading: isCreatingUploadKey }] = useMutation(GENERATE_UPLOAD_KEY);

  useEffect(() => {
    if (!selectedProvider) {
      setSelectedProvider(connectedProviders?.connectedProviders[0]?.id ?? null);
    }
  }, [connectedProviders, selectedProvider]);

  async function handleUpload() {
    if (!selectedProvider) return;

    const path = search.path;

    const formData = new FormData();

    files.forEach((file) => {
      formData.append('files', file.file);
    });

    formData.append('providerId', selectedProvider);
    formData.append('path', path ?? '/');

    const response = await createUploadKey();

    if (response.data?.generateUploadKey) {
      setUploading(true);
      void fetch(`${config.apiUrl}/files/upload?key=${response.data.generateUploadKey}`, {
        method: 'POST',
        body: formData,
      })
        .then(() => {
          setUploading(false);
          setUploadModalOpen(false);

          toast.success('Upload started');
          client.refetchQueries({ include: [GET_FILES] }).catch((err) => {
            console.error(err);
          });
        })
        .catch(() => {
          setUploading(false);
          toast.error('Failed to start upload');
        });
    }
  }

  return (
    <Dialog
      open={uploadModalOpen}
      onOpenChange={(isOpen) => {
        if (!isOpen) {
          setUploadModalOpen(false);
          clearFiles();
          clearFileIds();
        }
      }}
    >
      <DialogContent className="p-0 min-w-[40rem]">
        <DialogHeader className="px-8 py-10 select-none">
          <DialogTitle className="text-2xl">Upload Files</DialogTitle>
          <DialogDescription>Please select where you want to upload your files.</DialogDescription>

          <div className="flex gap-10 justify-between pt-10">
            <Select value={selectedProvider ?? undefined} onValueChange={setSelectedProvider}>
              <SelectTrigger className="w-[300px]">
                <SelectValue placeholder="Select provider" />
              </SelectTrigger>
              <SelectContent>
                {connectedProviders?.connectedProviders.map((provider) => {
                  const iconUrl = getProviderIcon(provider.type);

                  return (
                    <SelectItem key={provider.id} value={provider.id}>
                      <div className="flex items-center gap-2">
                        <img src={iconUrl} alt={provider.name} width={20} height={20} />
                        {provider.name}
                      </div>
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          </div>
        </DialogHeader>

        <div className="py-10 px-8 bg-accent/30 border-t space-y-10">
          <div className="space-y-4 max-h-[15rem] overflow-auto">
            {files.length === 0 && (
              <p className="text-sm text-muted-foreground">No files selected</p>
            )}
            {files.map(({ id, file }) => {
              if (!file) return null;

              let Placeholder: React.ReactNode | null = null;

              if (file.type.startsWith('image/')) {
                const objectUrl = URL.createObjectURL(file);
                Placeholder = (
                  <img
                    src={objectUrl}
                    alt={file.name}
                    width={50}
                    height={50}
                    className="rounded-md h-12 w-12"
                  />
                );
              } else {
                Placeholder = <FileIcon className="h-12 w-12 p-2 bg-secondary rounded" />;
              }

              return (
                <div key={id} className="flex items-center gap-4">
                  {Placeholder}
                  <div className="flex-1">
                    <p className="">{file.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {file.type} ({byteSize(file.size).toString()})
                    </p>
                  </div>
                  <XIcon
                    size={16}
                    className="cursor-pointer"
                    onClick={() => {
                      removeFile(id);
                    }}
                  />
                </div>
              );
            })}
          </div>

          <Button
            variant={'secondary'}
            className="w-full"
            onClick={() => void handleUpload()}
            isLoading={isCreatingUploadKey || uploading}
          >
            Start Upload
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
