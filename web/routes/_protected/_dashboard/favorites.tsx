import FileList from '@drivebase/web/components/files/file.list';
import { createFileRoute } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';

export const Route = createFileRoute('/_protected/_dashboard/favorites')({
  component: RouteComponent,
});

function RouteComponent() {
  const { t } = useTranslation(['dashboard']);

  return (
    <div className="space-y-10">
      <div className="space-y-1">
        <h1 className="text-xl font-bold">{t('dashboard:favorites')}</h1>
        <p className="text-muted-foreground">
          {t('dashboard:favorites_description')}
        </p>
      </div>
      <FileList starred />
    </div>
  );
}
