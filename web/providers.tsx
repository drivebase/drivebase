import '@drivebase/web/globals.css';

import { ApolloClient, ApolloProvider, InMemoryCache } from '@apollo/client';
import { makeStore } from '@drivebase/web/lib/redux/store';
import { Provider as ReduxProvider } from 'react-redux';
import { Toaster } from 'sonner';

import { config } from './constants/config';
import { ThemeProvider } from './theme.provider';

interface ProvidersProps {
  children: React.ReactNode;
}

const store = makeStore();

const client = new ApolloClient({
  uri: `${config.apiUrl}/graphql`,
  cache: new InMemoryCache(),
});

export function Providers({ children }: ProvidersProps) {
  return (
    <ApolloProvider client={client}>
      <ThemeProvider defaultTheme="system">
        <ReduxProvider store={store}>
          <Toaster position="bottom-center" />
          {children}
        </ReduxProvider>
      </ThemeProvider>
    </ApolloProvider>
  );
}
