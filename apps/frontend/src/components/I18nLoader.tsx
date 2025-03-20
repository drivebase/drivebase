import { ReactNode, useEffect, useState } from 'react';
import { i18nPromise } from '../i18n';
import { Loader } from 'lucide-react';

interface I18nLoaderProps {
  children: ReactNode;
}

export function I18nLoader({ children }: I18nLoaderProps) {
  const [translationsLoaded, setTranslationsLoaded] = useState(false);

  useEffect(() => {
    i18nPromise.then(() => {
      setTranslationsLoaded(true);
    });
  }, []);

  if (!translationsLoaded) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader className="w-10 h-10 animate-spin" />
      </div>
    );
  }

  return children;
}
