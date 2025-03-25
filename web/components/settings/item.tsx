import React from 'react';

type SettingItemProps = {
  title: string;
  description: string;
  children: React.ReactNode;
};

function SettingItem({ title, description, children }: SettingItemProps) {
  return (
    <div className="flex items-center justify-between rounded-xl border p-6">
      <div className="flex flex-col gap-1">
        <h1 className="font-medium">{title}</h1>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
      {children}
    </div>
  );
}

export default SettingItem;
