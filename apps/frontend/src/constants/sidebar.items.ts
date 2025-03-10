import {
  LayoutDashboardIcon,
  SettingsIcon,
  StarIcon,
  TrashIcon,
  UserIcon,
  KeyIcon,
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
    label: 'API Keys',
    icon: KeyIcon,
    href: '/settings/keys',
  },
];
