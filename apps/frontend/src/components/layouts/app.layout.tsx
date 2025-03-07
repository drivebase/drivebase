import AppSidebar from '@xilehq/frontend/components/layouts/app.sidebar';
import { SidebarProvider } from '@xilehq/ui/components/sidebar';

type AppLayoutProps = {
  children: React.ReactNode;
};

function AppLayout({ children }: AppLayoutProps) {
  return (
    <SidebarProvider>
      <AppSidebar />
      <main className="h-screen flex-1 bg-sidebar pt-2">
        <div className="h-full rounded-tl-2xl border bg-background p-10">
          {children}
        </div>
      </main>
    </SidebarProvider>
  );
}

export default AppLayout;
