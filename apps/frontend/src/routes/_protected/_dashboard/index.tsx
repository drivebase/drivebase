import { createFileRoute } from '@tanstack/react-router';
import FileList from '@drivebase/frontend/components/files/file.list';
import NewFolderDialog from '@drivebase/frontend/components/files/new.folder.dialog';
import { useTranslation } from 'react-i18next';
import DashboardStats from '@drivebase/frontend/components/dashboard/stats';

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
        <DashboardStats />
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
