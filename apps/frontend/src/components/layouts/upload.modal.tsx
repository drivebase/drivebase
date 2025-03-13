'use client';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@drivebase/react/components/dialog';
import {
  useAppDispatch,
  useAppSelector,
} from '@drivebase/react/lib/redux/hooks';
import {
  setUploadModalOpen,
  clearFileIds,
} from '@drivebase/react/lib/redux/reducers/uploader.reducer';
import { FileIcon, XIcon } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useFileStore } from '@drivebase/react/lib/contexts/file-store.context';
import Image from 'next/image';
import { Button } from '@drivebase/react/components/button';
import { useGetAvailableProvidersQuery } from '@drivebase/react/lib/redux/endpoints/providers';
import { cn } from '@drivebase/react/lib/utils';

export function UploadModal() {
  const imageUrlsRef = useRef<string[]>([]);
  const dispatch = useAppDispatch();
  const { uploadModalOpen } = useAppSelector((s) => s.uploader);
  const { files, clearFiles, removeFile } = useFileStore();
  const [selectedProviders, setSelectedProviders] = useState<string[]>([]);

  const { data: providers } = useGetAvailableProvidersQuery();

  // Clean up files and object URLs when the modal is closed
  useEffect(() => {
    if (!uploadModalOpen) {
      // Clean up any existing object URLs
      imageUrlsRef.current.forEach((url) => URL.revokeObjectURL(url));
      imageUrlsRef.current = [];
      clearFiles();
      dispatch(clearFileIds());
    }
  }, [uploadModalOpen, dispatch, clearFiles]);

  return (
    <Dialog
      open={uploadModalOpen}
      onOpenChange={() => {
        dispatch(setUploadModalOpen(!uploadModalOpen));
      }}
    >
      <DialogContent className="p-0 w-[30rem]">
        <DialogHeader className="px-8 py-10 select-none text-center">
          <DialogTitle className="mx-auto text-2xl">
            Select providers
          </DialogTitle>
          <DialogDescription className="text-center">
            Please select where you want to upload your files.
          </DialogDescription>
        </DialogHeader>

        <div className="py-10 px-8 bg-accent/30 border-t space-y-10">
          <div className="flex flex-wrap gap-2">
            {providers?.data.map((provider) => (
              <div
                key={provider.label}
                onClick={() => {
                  const old = selectedProviders.includes(provider.label);
                  setSelectedProviders((prev) =>
                    old
                      ? prev.filter((p) => p !== provider.label)
                      : [...prev, provider.label]
                  );
                }}
                className="cursor-pointer"
              >
                <Image
                  draggable={false}
                  src={provider.logo}
                  alt={provider.label}
                  width={65}
                  height={65}
                  className={cn(
                    'p-4 h-14 w-14 rounded-md',
                    selectedProviders.includes(provider.label) && 'bg-secondary'
                  )}
                />
              </div>
            ))}
          </div>

          <div className="space-y-4 max-h-[15rem] overflow-auto">
            {files.map(({ id, file }) => {
              if (!file) return null;

              let Placeholder = null;

              if (file.type.startsWith('image/')) {
                const objectUrl = URL.createObjectURL(file);
                Placeholder = (
                  <Image
                    src={objectUrl}
                    alt={file.name}
                    width={50}
                    height={50}
                    className="rounded-md h-12 w-12"
                  />
                );
              } else {
                Placeholder = <FileIcon size={100} />;
              }

              return (
                <div key={id} className="flex items-center gap-4">
                  {Placeholder}
                  <div className="flex-1">
                    <p className="">{file.name}</p>
                    <p className="text-sm text-muted-foreground">{file.type}</p>
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

          <Button variant={'secondary'} className="w-full">
            Start Upload
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
