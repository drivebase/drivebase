import { useQuery } from '@apollo/client';
import { useRouter } from '@tanstack/react-router';
import { Loader } from 'lucide-react';

import AppSidebar from '@drivebase/web/components/layouts/app.sidebar';
import { UploadModal } from '@drivebase/web/components/layouts/upload.modal';
import { SidebarProvider } from '@drivebase/web/components/ui/sidebar';
import { GET_CURRENT_WORKSPACE } from '@drivebase/web/gql/queries/workspaces';
import { FileStoreProvider } from '@drivebase/web/lib/contexts/file-store.context';
import { cn } from '@drivebase/web/lib/utils';

type AppLayoutProps = {
  children: React.ReactNode;
};

function AppLayout({ children }: AppLayoutProps) {
  const router = useRouter();
  const { data: workspace, loading, error } = useQuery(GET_CURRENT_WORKSPACE);

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center">
        <Loader className="w-10 h-10 animate-spin" />
      </div>
    );
  }

  if (error) {
    if ('status' in error && error.status === 401) {
      void router.navigate({ to: '/workspaces' });
      return null;
    }
  }

  if (!workspace) {
    return <div>No workspace found</div>;
  }

  return (
    <FileStoreProvider>
      <SidebarProvider>
        <AppSidebar />
        <main className="h-screen flex-1 flex items-start bg-sidebar pt-2 gap-2">
          <div
            className={cn(
              'h-full flex-1 rounded-tl-2xl border bg-background p-10 overflow-auto [&::-webkit-scrollbar]:hidden',
            )}
          >
            {children}
          </div>
        </main>
      </SidebarProvider>
      <UploadModal />
    </FileStoreProvider>
  );
}

export default AppLayout;
