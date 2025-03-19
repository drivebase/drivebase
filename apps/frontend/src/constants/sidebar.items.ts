import {
  LayoutDashboardIcon,
  SettingsIcon,
  StarIcon,
  TrashIcon,
  CloudIcon,
} from 'lucide-react';

type SidebarItem = {
  label: string;
  icon: React.ElementType;
  href: string;
  regex?: RegExp;
};

export const mainItems: SidebarItem[] = [
  {
    label: 'Dashboard',
    icon: LayoutDashboardIcon,
    href: '/',
  },
  {
    label: 'Favorites',
    icon: StarIcon,
    href: '/favorites',
  },
  {
    label: 'Recycle Bin',
    icon: TrashIcon,
    href: '/recycle-bin',
  },
  {
    label: 'Settings',
    icon: SettingsIcon,
    href: '/settings',
  },
];

export const settingsItems: SidebarItem[] = [
  {
    label: 'General',
    icon: SettingsIcon,
    href: '/settings',
  },
  {
    label: 'Providers',
    icon: CloudIcon,
    href: '/settings/providers',
    regex: /\/settings\/providers(.*)/,
  },
];
