import AccountList from '@drivebase/frontend/components/accounts/account.list';

function Page() {
  return (
    <div className="space-y-10">
      <div className="space-y-1">
        <h1 className="text-xl font-bold">Accounts</h1>
        <p className="text-muted-foreground">Manage your accounts here.</p>
      </div>
      <AccountList />
    </div>
  );
}

export default Page;
