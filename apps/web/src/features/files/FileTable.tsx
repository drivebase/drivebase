import type { FileItemFragment } from "@/gql/graphql";
import { FileSystemTable } from "./FileSystemTable";

interface FileTableProps {
  files: FileItemFragment[];
  onDownloadFile?: (file: FileItemFragment) => void;
  onShowFileDetails?: (file: FileItemFragment) => void;
  onToggleFileFavorite?: (file: FileItemFragment) => void;
  isLoading?: boolean;
}

export function FileTable({
  files,
  onDownloadFile,
  onShowFileDetails,
  onToggleFileFavorite,
  isLoading,
}: FileTableProps) {
  return (
    <FileSystemTable
      files={files}
      folders={[]}
      onDownloadFile={onDownloadFile}
      onShowFileDetails={onShowFileDetails}
      onToggleFileFavorite={onToggleFileFavorite}
      isLoading={isLoading}
      showSharedColumn
      emptyStateMessage="No files yet"
    />
  );
}
