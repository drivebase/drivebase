'use client';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@drivebase/react/components/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@drivebase/react/components/select';
import {
  useAppDispatch,
  useAppSelector,
} from '@drivebase/react/lib/redux/hooks';
import {
  setUploadModalOpen,
  clearFileIds,
} from '@drivebase/react/lib/redux/reducers/uploader.reducer';
import { FileIcon, XIcon } from 'lucide-react';
import { useState } from 'react';
import { useFileStore } from '@drivebase/react/lib/contexts/file-store.context';
import { Button } from '@drivebase/react/components/button';
import { useGetProvidersQuery } from '@drivebase/react/lib/redux/endpoints/providers';
import byteSize from 'byte-size';
import { useUploadFileMutation } from '@drivebase/react/lib/redux/endpoints/files';
import { getProviderIcon } from '@drivebase/frontend/helpers/provider.icon';
import { toast } from 'sonner';
import { useSearch } from '@tanstack/react-router';

export function UploadModal() {
  const search = useSearch({ strict: false });

  const dispatch = useAppDispatch();
  const { uploadModalOpen } = useAppSelector((s) => s.uploader);
  const { files, clearFiles, removeFile } = useFileStore();

  const [selectedProvider, setSelectedProvider] = useState<string | null>(null);

  console.log('selectedProvider', selectedProvider);

  // const { data: providers } = useGetAvailableProvidersQuery();
  const { data: connectedProviders } = useGetProvidersQuery();
  const [uploadFile, { isLoading }] = useUploadFileMutation();

  async function handleUpload() {
    if (!selectedProvider) return;

    const path = search.path;

    uploadFile({
      files: files.map(({ file }) => file),
      providerId: selectedProvider,
      path: path ?? '/',
    })
      .unwrap()
      .then(() => {
        toast.success('Files uploaded successfully');
        dispatch(setUploadModalOpen(false));
        clearFiles();
      })
      .catch((error) => {
        toast.error(error.data.message);
      });
  }

  return (
    <Dialog
      open={uploadModalOpen}
      onOpenChange={(isOpen) => {
        if (!isOpen) {
          dispatch(setUploadModalOpen(false));
          clearFiles();
          dispatch(clearFileIds());
        }
      }}
    >
      <DialogContent className="p-0 min-w-[40rem]">
        <DialogHeader className="px-8 py-10 select-none">
          <DialogTitle className="text-2xl">Upload Files</DialogTitle>
          <DialogDescription>
            Please select where you want to upload your files.
          </DialogDescription>

          <div className="flex gap-10 justify-between pt-10">
            <Select
              value={selectedProvider ?? undefined}
              onValueChange={setSelectedProvider}
            >
              <SelectTrigger className="w-[300px]">
                <SelectValue placeholder="Select provider" />
              </SelectTrigger>
              <SelectContent>
                {connectedProviders?.data.map((provider) => {
                  const iconUrl = getProviderIcon(provider.type);

                  return (
                    <SelectItem key={provider.id} value={provider.id}>
                      <div className="flex items-center gap-2">
                        <img
                          src={iconUrl}
                          alt={provider.label}
                          width={20}
                          height={20}
                        />
                        {provider.label}
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

              let Placeholder = null;

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
                Placeholder = (
                  <FileIcon className="h-12 w-12 p-2 bg-secondary rounded" />
                );
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
            onClick={handleUpload}
            isLoading={isLoading}
          >
            Start Upload
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
