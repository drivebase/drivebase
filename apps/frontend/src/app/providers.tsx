'use client';

import { useRef } from 'react';
import { Provider as ReduxProvider } from 'react-redux';
import { ThemeProvider as NextThemesProvider } from 'next-themes';
import { makeStore, AppStore } from '@drivebase/ui/lib/redux/store';
import { Toaster } from 'sonner';

function Providers({ children }: { children: React.ReactNode }) {
  const storeRef = useRef<AppStore | undefined>(undefined);

  if (!storeRef.current) {
    storeRef.current = makeStore();
  }

  return (
    <NextThemesProvider
      disableTransitionOnChange
      attribute="class"
      defaultTheme="system"
      enableSystem
      enableColorScheme
    >
      <ReduxProvider store={storeRef.current}>
        <Toaster position="bottom-center" />
        {children}
      </ReduxProvider>
    </NextThemesProvider>
  );
}

export default Providers;
