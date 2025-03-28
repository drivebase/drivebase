import { useQuery } from '@apollo/client';
import { Link } from '@tanstack/react-router';
import byteSize from 'byte-size';
import { ArrowRight, FileTextIcon, FolderIcon, ImageIcon, VideoIcon } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { Skeleton } from '@drivebase/web/components/ui/skeleton';
import { GET_WORKSPACE_STATS } from '@drivebase/web/gql/queries/workspace';
import { cn } from '@drivebase/web/lib/utils';

const baseStats = [
  {
    title: 'Images',
    count: 0,
    icon: ImageIcon,
    suffix: '',
    iconColor: 'text-blue-500 dark:text-blue-400',
    bgColor: 'bg-blue-50 dark:bg-blue-900/30',
    size: '0 KB',
  },
  {
    title: 'Videos',
    count: 0,
    icon: VideoIcon,
    suffix: '',
    iconColor: 'text-purple-500 dark:text-purple-400',
    bgColor: 'bg-purple-50 dark:bg-purple-900/30',
    size: '0 KB',
  },
  {
    title: 'Documents',
    count: 0,
    icon: FileTextIcon,
    suffix: '',
    iconColor: 'text-amber-500 dark:text-amber-400',
    bgColor: 'bg-amber-50 dark:bg-amber-900/30',
    size: '0 KB',
  },
  {
    title: 'Others',
    count: 0,
    icon: FolderIcon,
    suffix: '',
    iconColor: 'text-green-500 dark:text-green-400',
    bgColor: 'bg-green-50 dark:bg-green-900/30',
    size: '0 KB',
  },
];

function DashboardStats() {
  const [stats, setStats] = useState(baseStats);
  const { data: statData, loading } = useQuery(GET_WORKSPACE_STATS);
  const { t } = useTranslation(['common']);

  useEffect(() => {
    if (statData) {
      setStats((prev) => {
        const newStat = [...prev];
        for (const stat of statData.workspaceStats) {
          const index = prev.findIndex((s) => s.title === stat.title);
          if (index !== -1) {
            newStat[index] = {
              ...newStat[index],
              ...stat,
              size: byteSize(stat.size).toString(),
            };
          }
        }
        return newStat;
      });
    }
  }, [statData]);

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {loading
        ? Array(4)
            .fill(null)
            .map((_, index) => <Skeleton key={index} className="w-full h-32" />)
        : stats.map((stat) => (
            <div key={stat.title} className="bg-background border rounded-lg">
              <div className="flex items-center p-6">
                <div
                  className={cn(
                    'flex items-center justify-center w-12 h-12 rounded-full mr-4',
                    stat.bgColor,
                  )}
                >
                  <stat.icon className={`w-6 h-6 ${stat.iconColor}`} />
                </div>
                <div>
                  <p className="text-sm font-medium opacity-50">
                    {t(`common:${stat.title.toLowerCase()}`)}
                  </p>
                  <div className="flex items-baseline">
                    <p className="text-2xl font-semibold">{stat.count}</p>
                  </div>
                </div>
              </div>
              <div className="text-xs px-4 py-2 flex items-center justify-between border-t">
                <p className="text-muted-foreground mt-1">
                  Total size is <strong>{stat.size}</strong>
                </p>

                <Link to="" className="inline-flex items-center gap-2 text-muted-foreground">
                  View <ArrowRight size={14} />
                </Link>
              </div>
            </div>
          ))}
    </div>
  );
}

export default DashboardStats;
