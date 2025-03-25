import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@drivebase/web/components/ui/select';
import { Skeleton } from '@drivebase/web/components/ui/skeleton';
import { Tabs, TabsList, TabsTrigger } from '@drivebase/web/components/ui/tabs';
import { SUPPORTED_LANGUAGES } from '@drivebase/web/i18n';
import { useTheme } from '@drivebase/web/theme.provider';
import ISO6391 from 'iso-639-1';
import Cookies from 'js-cookie';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';

import SettingItem from './item';

type Theme = 'system' | 'light' | 'dark';

function ApplicationSettings() {
  const { setTheme, theme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const { t, i18n } = useTranslation(['settings']);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted)
    return (
      <div className="space-y-1.5">
        <Skeleton className="h-20 w-full rounded-2xl" />
        <Skeleton className="h-72 w-full rounded-2xl" />
      </div>
    );
  return (
    <div className="space-y-4">
      <SettingItem
        title={t('appearance')}
        description={t('appearance_description')}
      >
        <div className="flex items-center gap-2">
          <Tabs
            defaultValue={theme}
            onValueChange={(value) => {
              setTheme(value as Theme);
            }}
          >
            <TabsList>
              <TabsTrigger value="system">{t('system')}</TabsTrigger>
              <TabsTrigger value="light">{t('light')}</TabsTrigger>
              <TabsTrigger value="dark">{t('dark')}</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </SettingItem>

      <SettingItem
        title={t('language')}
        description={t('language_description')}
      >
        <div className="flex items-center gap-2">
          <Select
            defaultValue={i18n.resolvedLanguage}
            onValueChange={(value) => {
              i18n
                .changeLanguage(value)
                .then(() => {
                  Cookies.set('language', value);
                })
                .catch((err) => {
                  toast.error(err.data?.message ?? 'An unknown error occurred');
                });
            }}
          >
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder={t('language')} />
            </SelectTrigger>
            <SelectContent>
              {SUPPORTED_LANGUAGES.map((language) => (
                <SelectItem key={language} value={language}>
                  {ISO6391.getNativeName(language)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </SettingItem>
    </div>
  );
}

export default ApplicationSettings;
