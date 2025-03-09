import SettingsAppearance from '@xilehq/frontend/components/settings/appearance';

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

export default Page;
