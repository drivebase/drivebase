import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { makeReq } from '@drivebase/frontend/helpers/make.req';
import WorkspaceProvider from '@drivebase/frontend/components/layouts/workspace.provider';
import AppLayout from '@drivebase/frontend/components/layouts/app.layout';

async function Layout({ children }: { children: React.ReactNode }) {
  const cookiesList = await cookies();
  const accessToken = cookiesList.get('accessToken')?.value;

  if (!accessToken) {
    redirect('/auth/login');
  }

  const workspacesReq = await makeReq('/workspaces', {
    method: 'GET',
  });

  if (!workspacesReq.ok) {
    redirect('/auth/login');
  }

  const workspaces = await workspacesReq.json();

  if (workspaces.data.length === 0) {
    redirect('/onboarding');
  }

  const workspaceId = cookiesList.get('workspaceId')?.value;

  if (!workspaceId) {
    redirect('/workspaces');
  }

  const workspaceResponse = await makeReq(`/workspaces/${workspaceId}`, {
    method: 'GET',
  });

  if (!workspaceResponse.ok) {
    return <div>An error occurred. Please try again.</div>;
  }

  const workspace = await workspaceResponse.json();

  return (
    <WorkspaceProvider workspace={workspace.data}>
      <AppLayout>{children}</AppLayout>
    </WorkspaceProvider>
  );
}

export default Layout;
