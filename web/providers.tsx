import { ApolloClient, ApolloProvider, HttpLink, InMemoryCache, from } from '@apollo/client';
import { setContext } from '@apollo/client/link/context';
import { Toaster } from 'sonner';

import '@drivebase/web/globals.css';

import { config } from './constants/config';
import { ThemeProvider } from './theme.provider';

const authLink = setContext((_, { headers }) => {
  const token = localStorage.getItem('accessToken');

  return {
    headers: {
      ...headers,
      authorization: token ? `Bearer ${token}` : '',
      'x-workspace-id': localStorage.getItem('workspaceId') || '',
    } as Record<string, string>,
  };
});

const httpLink = new HttpLink({ uri: `${config.apiUrl}/graphql` });

const link = from([authLink, httpLink]);

const client = new ApolloClient({
  cache: new InMemoryCache(),
  link,
});

type ProvidersProps = {
  children: React.ReactNode;
};
export function Providers({ children }: ProvidersProps) {
  return (
    <ApolloProvider client={client}>
      <ThemeProvider defaultTheme="system">
        <Toaster position="bottom-center" />
        {children}
      </ThemeProvider>
    </ApolloProvider>
  );
}
