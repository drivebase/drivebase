'use client';

import React, { createContext, useContext, useCallback, useState } from 'react';
import { nanoid } from 'nanoid';

interface FileStoreContextType {
  storeFiles: (files: File[] | FileList | File) => string[];
  getFile: (id: string) => File | undefined;
  removeFile: (id: string) => void;
  clearFiles: () => void;
  files: {
    id: string;
    file: File;
  }[];
}

const FileStoreContext = createContext<FileStoreContextType | null>(null);

export function FileStoreProvider({ children }: { children: React.ReactNode }) {
  const [files, setFiles] = useState<
    {
      id: string;
      file: File;
    }[]
  >([]);

  const storeFiles = useCallback((inputFiles: File[] | FileList | File) => {
    const newFiles = Array.isArray(inputFiles)
      ? inputFiles
      : inputFiles instanceof FileList
        ? Array.from(inputFiles)
        : [inputFiles];

    const newIds: string[] = [];

    for (const file of newFiles) {
      const id = nanoid();
      files.push({ id, file });
      newIds.push(id);
    }

    setFiles(files);

    return newIds;
  }, []);

  const getFile = useCallback(
    (id: string) => {
      return files.find((file) => file.id === id)?.file;
    },
    [files],
  );

  const removeFile = useCallback((id: string) => {
    setFiles((prevFiles) => {
      const newFiles = prevFiles.filter((file) => file.id !== id);
      return newFiles;
    });
  }, []);

  const clearFiles = useCallback(() => {
    setFiles([]);
  }, []);

  return (
    <FileStoreContext.Provider
      value={{
        storeFiles,
        getFile,
        removeFile,
        clearFiles,
        files,
      }}
    >
      {children}
    </FileStoreContext.Provider>
  );
}

export function useFileStore() {
  const context = useContext(FileStoreContext);
  if (!context) {
    throw new Error('useFileStore must be used within a FileStoreProvider');
  }
  return context;
}
