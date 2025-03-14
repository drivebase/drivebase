import AppSidebar from '@drivebase/frontend/components/layouts/app.sidebar';
import { SidebarProvider } from '@drivebase/react/components/sidebar';
import { FileStoreProvider } from '@drivebase/react/lib/contexts/file-store.context';
import { UploadModal } from '@drivebase/frontend/components/layouts/upload.modal';

type AppLayoutProps = {
  children: React.ReactNode;
};

function AppLayout({ children }: AppLayoutProps) {
  return (
    <FileStoreProvider>
      <SidebarProvider>
        <AppSidebar />
        <main className="h-screen flex-1 flex items-start bg-sidebar pt-2 gap-2">
          <div className="h-full flex-1 rounded-tl-2xl border bg-background p-10">
            {children}
          </div>
        </main>
      </SidebarProvider>
      <UploadModal />
    </FileStoreProvider>
  );
}

export default AppLayout;
