import ProviderList from '@drivebase/frontend/components/providers/provider.list';

function Page() {
  return (
    <div className="space-y-10">
      <div className="space-y-1">
        <h1 className="text-xl font-bold">Providers</h1>
        <p className="text-muted-foreground">Manage your providers here.</p>
      </div>
      <ProviderList />
    </div>
  );
}

export default Page;
