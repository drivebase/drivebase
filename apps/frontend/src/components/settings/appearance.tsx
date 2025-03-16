import { useEffect, useState } from 'react';
import { Skeleton } from '@drivebase/react/components/skeleton';
import { useTheme } from '@drivebase/frontend/theme.provider';
import { Tabs, TabsList, TabsTrigger } from '@drivebase/react/components/tabs';
import SettingItem from './item';

type Theme = 'system' | 'light' | 'dark';

function SettingsGeneral() {
  const { setTheme, theme } = useTheme();
  const [mounted, setMounted] = useState(false);

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
    <div>
      <SettingItem
        title="Appearance"
        description="Change the appearance of the app"
      >
        <div className="flex items-center gap-2">
          <Tabs
            defaultValue={theme}
            onValueChange={(value) => {
              setTheme(value as Theme);
            }}
          >
            <TabsList>
              <TabsTrigger value="system">System</TabsTrigger>
              <TabsTrigger value="light">Light</TabsTrigger>
              <TabsTrigger value="dark">Dark</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </SettingItem>
    </div>
  );
}

export default SettingsGeneral;
