import { FolderIcon, ImageIcon, VideoIcon, FileIcon } from 'lucide-react';

export function getFileIcon(name: string) {
  const extension = name.split('.').pop();
  switch (extension) {
    case 'png':
    case 'jpg':
    case 'jpeg':
      return ImageIcon;
    case 'gif':
      return VideoIcon;
    default:
      return FileIcon;
  }
}

export function getFolderIcon() {
  return FolderIcon;
}
