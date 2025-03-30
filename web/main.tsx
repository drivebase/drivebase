import { useQuery } from '@apollo/client';
import { RouterProvider, createRouter } from '@tanstack/react-router';
import { Loader } from 'lucide-react';
import ReactDOM from 'react-dom/client';

import { I18nLoader } from './components/I18nLoader';
import { GET_VERSION } from './gql/queries/public';
import './i18n';
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
  const { data, loading } = useQuery(GET_VERSION);

  if (loading) {
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
        version: data?.version || '',
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
