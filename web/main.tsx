import './i18n';

import { useGetVersionQuery } from '@drivebase/web/lib/redux/endpoints/public';
import { createRouter, RouterProvider } from '@tanstack/react-router';
import { Loader } from 'lucide-react';
import ReactDOM from 'react-dom/client';

import { I18nLoader } from './components/I18nLoader';
import { Providers } from './providers';
import { routeTree } from './routeTree.gen';

const router = createRouter({
  routeTree,
  context: {
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
      <I18nLoader>
        <InnserApp />
      </I18nLoader>
    </Providers>,
  );
}
