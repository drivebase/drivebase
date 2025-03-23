import { ImageIcon, VideoIcon, FileTextIcon, FolderIcon } from 'lucide-react';

const stats = [
  {
    title: 'Images',
    value: 450,
    icon: ImageIcon,
    suffix: '',
    iconColor: 'text-blue-500 dark:text-blue-400',
    bgColor: 'bg-blue-50 dark:bg-blue-900/30',
  },
  {
    title: 'Videos',
    value: 89,
    icon: VideoIcon,
    suffix: '',
    iconColor: 'text-purple-500 dark:text-purple-400',
    bgColor: 'bg-purple-50 dark:bg-purple-900/30',
  },
  {
    title: 'Documents',
    value: 2455,
    icon: FileTextIcon,
    suffix: '',
    iconColor: 'text-amber-500 dark:text-amber-400',
    bgColor: 'bg-amber-50 dark:bg-amber-900/30',
  },
  {
    title: 'Other',
    value: 789,
    icon: FolderIcon,
    suffix: '',
    iconColor: 'text-green-500 dark:text-green-400',
    bgColor: 'bg-green-50 dark:bg-green-900/30',
  },
];

function DashboardStats() {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {stats.map((stat) => (
        <div
          key={stat.title}
          className="flex items-center p-6 bg-background border rounded-lg shadow-sm"
        >
          <div
            className={`flex items-center justify-center w-12 h-12 ${stat.bgColor} rounded-full mr-4`}
          >
            <stat.icon className={`w-6 h-6 ${stat.iconColor}`} />
          </div>
          <div>
            <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
              {stat.title}
            </p>
            <div className="flex items-baseline">
              <p className="text-2xl font-semibold dark:text-white">
                {stat.value}
              </p>
              {stat.suffix && (
                <span className="ml-1 text-gray-400 dark:text-gray-500 text-sm">
                  {stat.suffix}
                </span>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

export default DashboardStats;
