import ProviderList from '@drivebase/frontend/components/providers/providers.list';
import { createFileRoute } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';

export const Route = createFileRoute(
  '/_protected/_dashboard/settings/providers'
)({
  component: RouteComponent,
});

function RouteComponent() {
  const { t } = useTranslation(['common', 'dashboard']);

  return (
    <div className="space-y-10">
      <div className="space-y-1">
        <h1 className="text-xl font-bold">{t('dashboard:providers')}</h1>
        <p className="text-muted-foreground">
          {t('dashboard:providers_description')}
        </p>
      </div>
      <ProviderList />
    </div>
  );
}
