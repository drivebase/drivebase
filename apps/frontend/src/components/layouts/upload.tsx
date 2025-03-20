import { useEffect, useRef, useState } from 'react';
import { motion, Transition } from 'framer-motion';
import { cn } from '@drivebase/react/lib/utils';
import { FileIcon } from 'lucide-react';
import { useAppDispatch } from '@drivebase/react/lib/redux/hooks';
import {
  setFileIds,
  setUploadModalOpen,
} from '@drivebase/react/lib/redux/reducers/uploader.reducer';
import { useFileStore } from '@drivebase/react/lib/contexts/file-store.context';
import { useTranslation } from 'react-i18next';

function SidebarUpload() {
  const ref = useRef<HTMLInputElement>(null);
  const dispatch = useAppDispatch();
  const { storeFiles } = useFileStore();
  const { t } = useTranslation(['common', 'dashboard']);

  const dragCounter = useRef(0);
  const [isDragging, setIsDragging] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const fileIds = storeFiles(e.target.files);
      dispatch(setFileIds(fileIds));
      dispatch(setUploadModalOpen(true));
    }
  };

  useEffect(() => {
    const handleDragEnter = (e: DragEvent) => {
      e.preventDefault();
      dragCounter.current++;
      if (dragCounter.current === 1) {
        setIsDragging(true);
      }
    };

    const handleDragLeave = (e: DragEvent) => {
      e.preventDefault();
      dragCounter.current--;
      if (dragCounter.current === 0) {
        setIsDragging(false);
      }
    };

    const handleDrop = (e: DragEvent) => {
      e.preventDefault();
      dragCounter.current = 0;
      setIsDragging(false);

      if (e.dataTransfer?.files.length) {
        const fileIds = storeFiles(e.dataTransfer.files);
        dispatch(setFileIds(fileIds));
        dispatch(setUploadModalOpen(true));
      }
    };

    const handleDragOver = (e: DragEvent) => {
      e.preventDefault();
    };

    window.addEventListener('dragenter', handleDragEnter);
    window.addEventListener('dragleave', handleDragLeave);
    window.addEventListener('drop', handleDrop);
    window.addEventListener('dragover', handleDragOver);

    return () => {
      window.removeEventListener('dragenter', handleDragEnter);
      window.removeEventListener('dragleave', handleDragLeave);
      window.removeEventListener('drop', handleDrop);
      window.removeEventListener('dragover', handleDragOver);
    };
  }, [dispatch, storeFiles]);

  return (
    <div
      className={cn(
        'relative bg-background text-muted-foreground flex h-32 cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border border-dashed',
        'hover:bg-accent/50 transition-all duration-200'
      )}
      onClick={() => ref.current?.click()}
    >
      {isDragging && (
        <BorderTrail
          className="bg-gradient-to-l from-blue-200 via-blue-500 to-blue-200 dark:from-blue-400 dark:via-blue-500 dark:to-blue-700"
          size={120}
        />
      )}
      <input
        ref={ref}
        type="file"
        multiple
        onChange={handleFileChange}
        className="hidden"
      />
      <FileIcon size={32} />
      <div className="text-center">
        <p className="text-sm font-medium">
          {t('dashboard:drop_files_here_title')}
        </p>
        <p className="text-xs">{t('dashboard:drop_files_here_description')}</p>
      </div>
    </div>
  );
}

export default SidebarUpload;

type BorderTrailProps = {
  className?: string;
  size?: number;
  transition?: Transition;
  delay?: number;
  onAnimationComplete?: () => void;
  style?: React.CSSProperties;
};

export function BorderTrail({
  className,
  size = 60,
  transition,
  delay,
  onAnimationComplete,
  style,
}: BorderTrailProps) {
  const BASE_TRANSITION = {
    repeat: Infinity,
    duration: 5,
    ease: 'linear',
  };

  return (
    <div className="pointer-events-none absolute inset-0 rounded-[inherit] border border-transparent [mask-clip:padding-box,border-box] [mask-composite:intersect] [mask-image:linear-gradient(transparent,transparent),linear-gradient(#000,#000)]">
      <motion.div
        className={cn('absolute aspect-square bg-zinc-500', className)}
        style={{
          width: size,
          offsetPath: `rect(0 auto auto 0 round ${size}px)`,
          ...style,
        }}
        animate={{
          offsetDistance: ['0%', '100%'],
        }}
        transition={{
          ...(transition ?? BASE_TRANSITION),
          delay: delay,
        }}
        onAnimationComplete={onAnimationComplete}
      />
    </div>
  );
}
