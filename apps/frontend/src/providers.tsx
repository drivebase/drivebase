import { Provider as ReduxProvider } from 'react-redux';
import { makeStore } from '@drivebase/react/redux/store';
import { ThemeProvider } from './theme.provider';
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
