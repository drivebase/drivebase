import { cn } from '@xilehq/ui/lib/utils';
import { ImageIcon } from 'lucide-react';

function SidebarUpload() {
  return (
    <div
      className={cn(
        'bg-background text-muted-foreground flex h-32 cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border border-dashed',
        'hover:bg-accent/50 transition-all duration-200'
      )}
    >
      <ImageIcon size={32} />
      <div className="text-center">
        <p className="text-sm font-medium">Drop files here</p>
        <p className="text-xs">or click here to upload</p>
      </div>
    </div>
  );
}

export default SidebarUpload;
