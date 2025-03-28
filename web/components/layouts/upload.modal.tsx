import { useQuery } from '@apollo/client';
import { useSearch } from '@tanstack/react-router';
import byteSize from 'byte-size';
import { FileIcon, XIcon } from 'lucide-react';
import { useState } from 'react';
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
import { GET_CONNECTED_PROVIDERS } from '@drivebase/web/gql/queries/providers';
import { getProviderIcon } from '@drivebase/web/helpers/provider.icon';
import { useFileStore } from '@drivebase/web/lib/contexts/file-store.context';
import { useUploadFileMutation } from '@drivebase/web/lib/redux/endpoints/files';
import { useAppDispatch, useAppSelector } from '@drivebase/web/lib/redux/hooks';
import {
  clearFileIds,
  setUploadModalOpen,
} from '@drivebase/web/lib/redux/reducers/uploader.reducer';

export function UploadModal() {
  const search = useSearch({ strict: false });

  const dispatch = useAppDispatch();
  const { uploadModalOpen } = useAppSelector((s) => s.uploader);
  const { files, clearFiles, removeFile } = useFileStore();

  const [selectedProvider, setSelectedProvider] = useState<string | null>(null);

  const [uploadFile, { isLoading }] = useUploadFileMutation();
  const { data: connectedProviders } = useQuery(GET_CONNECTED_PROVIDERS);

  function handleUpload() {
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
