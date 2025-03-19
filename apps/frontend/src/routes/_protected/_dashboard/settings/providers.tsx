import ProviderList from '@drivebase/frontend/components/providers/providers.list';
import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute(
  '/_protected/_dashboard/settings/providers'
)({
  component: RouteComponent,
});

function RouteComponent() {
  return (
    <div className="space-y-10">
      <div className="space-y-1">
        <h1 className="text-xl font-bold">Providers</h1>
        <p className="text-muted-foreground">
          List of providers that are connected to your account.
        </p>
      </div>
      <ProviderList />
    </div>
  );
}
