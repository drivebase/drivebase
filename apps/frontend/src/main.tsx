import ReactDOM from 'react-dom/client';
import { RouterProvider, createRouter } from '@tanstack/react-router';
import { routeTree } from './routeTree.gen';
import { AuthProvider, useAuth } from './auth.context';
import { Providers } from './providers';
import { useGetVersionQuery } from '@drivebase/react/lib/redux/endpoints/public';
import { Loader } from 'lucide-react';

const router = createRouter({
  routeTree,
  context: {
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    auth: undefined!,
    version: '',
  },
});

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router;
  }
}

const rootElement = document.getElementById('root') as HTMLElement;

function InnserApp() {
  const auth = useAuth();
  const { data: version, isLoading } = useGetVersionQuery();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader className="w-10 h-10 animate-spin" />
      </div>
    );
  }

  return (
    <RouterProvider
      router={router}
      context={{
        auth,
        version: version?.data || '',
      }}
      defaultPendingMinMs={0}
    />
  );
}

if (!rootElement.innerHTML) {
  const root = ReactDOM.createRoot(rootElement);
  root.render(
    <Providers>
      <AuthProvider>
        <InnserApp />
      </AuthProvider>
    </Providers>
  );
}
