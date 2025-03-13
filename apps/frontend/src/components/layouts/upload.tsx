'use client';

import { cn } from '@drivebase/react/lib/utils';
import { FileIcon } from 'lucide-react';
import { useAppDispatch } from '@drivebase/react/lib/redux/hooks';
import {
  setFileIds,
  setUploadModalOpen,
} from '@drivebase/react/lib/redux/reducers/uploader.reducer';
import { useRef } from 'react';
import { useFileStore } from '@drivebase/react/lib/contexts/file-store.context';

function SidebarUpload() {
  const ref = useRef<HTMLInputElement>(null);
  const dispatch = useAppDispatch();
  const { storeFiles } = useFileStore();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const fileIds = storeFiles(e.target.files);
      dispatch(setFileIds(fileIds));
      dispatch(setUploadModalOpen(true));
    }
  };

  return (
    <div
      className={cn(
        'bg-background text-muted-foreground flex h-32 cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border border-dashed',
        'hover:bg-accent/50 transition-all duration-200'
      )}
      onClick={() => ref.current?.click()}
    >
      <input
        ref={ref}
        type="file"
        multiple
        onChange={handleFileChange}
        className="hidden"
      />
      <FileIcon size={32} />
      <div className="text-center">
        <p className="text-sm font-medium">Drop files here</p>
        <p className="text-xs">or click here to upload</p>
      </div>
    </div>
  );
}

export default SidebarUpload;
