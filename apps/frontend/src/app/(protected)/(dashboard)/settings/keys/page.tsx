import KeyList from '@drivebase/frontend/components/keys/key.list';

function Page() {
  return (
    <div className="space-y-10">
      <div className="space-y-1">
        <h1 className="text-2xl font-bold">API Keys</h1>
        <p className="text-sm text-muted-foreground">
          Manage your provider&apos;s API keys here.
        </p>
      </div>
      <KeyList />
    </div>
  );
}

export default Page;
