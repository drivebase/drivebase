import { createFileRoute } from '@tanstack/react-router';
import FileList from '@drivebase/frontend/components/files/file.list';
import NewFolderDialog from '@drivebase/frontend/components/files/new.folder.dialog';
import { cn } from '@drivebase/react/lib/utils';
import { FileIcon, ImageIcon, VideoIcon } from 'lucide-react';
import { useTranslation } from 'react-i18next';

const cards = [
  {
    title: 'Image Files',
    icon: ImageIcon,
    total: 1768,
    size: '20 GB',
    maxSize: '120 GB',
    usage: (20 / 120) * 100,
    color: 'text-primary',
    progressColor: 'bg-primary',
  },
  {
    title: 'Video Files',
    icon: VideoIcon,
    total: 223,
    size: '10 GB',
    maxSize: '120 GB',
    usage: (10 / 120) * 100,
    color: 'text-red-500',
    progressColor: 'bg-red-500',
  },
  {
    title: 'Documents',
    icon: FileIcon,
    total: 456,
    size: '5 GB',
    maxSize: '120 GB',
    usage: (5 / 120) * 100,
    color: 'text-blue-500',
    progressColor: 'bg-blue-500',
  },
  {
    title: 'Others',
    icon: FileIcon,
    total: 456,
    size: '2 GB',
    maxSize: '120 GB',
    usage: (2 / 120) * 100,
    color: 'text-green-500',
    progressColor: 'bg-green-500',
  },
];

function Page() {
  const { t } = useTranslation(['common', 'dashboard']);

  return (
    <div className="space-y-6">
      <div className="flex justify-between">
        <h1 className="text-2xl font-semibold">{t('dashboard:dashboard')}</h1>
        <div className="flex items-center gap-2">
          <NewFolderDialog />
        </div>
      </div>

      <div className="space-y-10">
        <div
          className={cn('grid gap-4 md:grid-cols-2 lg:grid-cols-4', {
            // 'lg:grid-cols-2': true,
          })}
        >
          {cards.map((card) => (
            <div
              key={card.title}
              className="bg-card rounded-lg border p-4 shadow-sm"
            >
              <div className="flex items-center gap-2">
                <div
                  className={cn(
                    'border-border/70 rounded-md border p-2.5',
                    card.color
                  )}
                >
                  <card.icon className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-foreground font-semibold">
                    {card.title}
                  </h2>
                  <p className="text-muted-foreground text-xs">
                    {card.total.toLocaleString()} items
                  </p>
                </div>
              </div>

              <div className="mt-4">
                <div className="flex justify-between text-sm">
                  <p>{card.size}</p>
                  <p>of {card.maxSize}</p>
                </div>
                <div className="bg-secondary mt-2 h-2 w-full overflow-hidden rounded-full">
                  <div
                    className={cn('h-full transition-all', card.progressColor)}
                    style={{ width: `${card.usage}%` }}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>

        <FileList />
      </div>
    </div>
  );
}

type Search = {
  path?: string;
};

export const Route = createFileRoute('/_protected/_dashboard/')({
  component: Page,
  validateSearch: (search: Partial<Search>): Search => {
    return {
      path: search.path,
    };
  },
});
