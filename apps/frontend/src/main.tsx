import './i18n';
// @ts-expect-error - valid
import '@drivebase/react/globals.css';
import ReactDOM from 'react-dom/client';
import { RouterProvider, createRouter } from '@tanstack/react-router';
import { routeTree } from './routeTree.gen';
import { Providers } from './providers';
import { useGetVersionQuery } from '@drivebase/react/redux/endpoints/public';
import { Loader } from 'lucide-react';
import { I18nLoader } from './components/I18nLoader';

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

// eslint-disable-next-line react-refresh/only-export-components
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
