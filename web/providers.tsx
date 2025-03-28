import '@drivebase/web/globals.css';

import { Provider as ReduxProvider } from 'react-redux';
import { ThemeProvider } from './theme.provider';
import { makeStore } from '@drivebase/web/lib/redux/store';
import { Toaster } from 'sonner';

interface ProvidersProps {
  children: React.ReactNode;
}

const store = makeStore();

export function Providers({ children }: ProvidersProps) {
  return (
    <ThemeProvider defaultTheme="system">
      <ReduxProvider store={store}>
        <Toaster position="bottom-center" />
        {children}
      </ReduxProvider>
    </ThemeProvider>
  );
}
