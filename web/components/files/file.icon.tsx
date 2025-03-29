import {
  FileIcon as DefaultFileIcon,
  FileAudioIcon,
  FileTextIcon,
  FolderIcon,
  ImageIcon,
  VideoIcon,
} from 'lucide-react';

import { File as DBFile } from '@drivebase/sdk';

interface FileIconProps {
  file: DBFile;
  size?: number;
  className?: string;
}

export function FileIcon({ file, size = 16, className = '' }: FileIconProps) {
  if (file.isFolder) {
    return <FolderIcon size={size} className={`text-yellow-500 ${className}`} />;
  }

  // Get file type from mime type or extension
  const mimeType = file.mimeType?.toLowerCase() || '';
  const extension = file.name.split('.').pop()?.toLowerCase() || '';

  if (
    mimeType.startsWith('image/') ||
    ['jpg', 'jpeg', 'png', 'gif', 'svg', 'webp'].includes(extension)
  ) {
    return <ImageIcon size={size} className={`text-blue-500 ${className}`} />;
  }

  if (mimeType.startsWith('video/') || ['mp4', 'webm', 'avi', 'mov', 'mkv'].includes(extension)) {
    return <VideoIcon size={size} className={`text-red-500 ${className}`} />;
  }

  if (mimeType.startsWith('audio/') || ['mp3', 'wav', 'ogg', 'flac'].includes(extension)) {
    return <FileAudioIcon size={size} className={`text-purple-500 ${className}`} />;
  }

  if (
    [
      'txt',
      'pdf',
      'doc',
      'docx',
      'md',
      'rtf',
      'odt',
      'html',
      'htm',
      'xls',
      'xlsx',
      'csv',
      'ppt',
      'pptx',
    ].includes(extension)
  ) {
    return <FileTextIcon size={size} className={`text-gray-500 ${className}`} />;
  }

  // Default file icon
  return <DefaultFileIcon size={size} className={`text-gray-400 ${className}`} />;
}
