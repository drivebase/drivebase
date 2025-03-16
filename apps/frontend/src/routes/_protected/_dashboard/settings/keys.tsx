import { createFileRoute } from '@tanstack/react-router';
import KeyList from '@drivebase/frontend/components/keys/key.list';

function Page() {
  return (
    <div className="space-y-10">
      <div className="space-y-1">
        <h1 className="text-xl font-bold">API Keys</h1>
        <p className="text-muted-foreground">
          Manage your provider&apos;s API keys here.
        </p>
      </div>
      <KeyList />
    </div>
  );
}

export const Route = createFileRoute('/_protected/_dashboard/settings/keys')({
  component: Page,
});
