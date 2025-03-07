import {
  LayoutDashboardIcon,
  SettingsIcon,
  StarIcon,
  TrashIcon,
  KeyIcon,
  CloudIcon,
  UserIcon,
} from 'lucide-react';

export const mainItems = [
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
    isSettingsButton: true,
  },
];

export const settingsItems = [
  {
    label: 'General',
    icon: SettingsIcon,
    href: '/settings',
  },
  {
    label: 'Accounts',
    icon: UserIcon,
    href: '/settings/accounts',
  },
  {
    label: 'Providers',
    icon: CloudIcon,
    href: '/settings/providers',
  },
  {
    label: 'API Keys',
    icon: KeyIcon,
    href: '/settings/api-keys',
  },
];
