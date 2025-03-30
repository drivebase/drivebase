import { createFileRoute } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';

import ApplicationSettings from '@drivebase/web/components/settings/application';

function Page() {
  const { t } = useTranslation(['common', 'dashboard']);

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="text-xl font-semibold">{t('dashboard:general')}</h1>
        <p className="text-muted-foreground">{t('dashboard:general_description')}</p>
      </div>
      <ApplicationSettings />
    </div>
  );
}

export const Route = createFileRoute('/_protected/_dashboard/settings/')({
  component: Page,
});
