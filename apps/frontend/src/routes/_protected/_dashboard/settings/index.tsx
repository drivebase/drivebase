import { createFileRoute } from '@tanstack/react-router';
import SettingsAppearance from '@drivebase/frontend/components/settings/appearance';

function Page() {
  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="text-xl font-semibold">Settings</h1>
        <p className="text-muted-foreground">
          Manage your settings and preferences.
        </p>
      </div>
      <SettingsAppearance />
    </div>
  );
}

export const Route = createFileRoute('/_protected/_dashboard/settings/')({
  component: Page,
});
