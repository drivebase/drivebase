import { CloudIcon, LayoutDashboardIcon, SettingsIcon, StarIcon, TrashIcon } from 'lucide-react';

type SidebarItem = {
  label: string;
  icon: React.ElementType;
  href: string;
  regex?: RegExp;
};

export const mainItems: SidebarItem[] = [
  {
    label: 'dashboard',
    icon: LayoutDashboardIcon,
    href: '/',
  },
  {
    label: 'favorites',
    icon: StarIcon,
    href: '/favorites',
  },
  {
    label: 'recycle_bin',
    icon: TrashIcon,
    href: '/recycle-bin',
  },
  {
    label: 'settings',
    icon: SettingsIcon,
    href: '/settings',
  },
];

export const settingsItems: SidebarItem[] = [
  {
    label: 'general',
    icon: SettingsIcon,
    href: '/settings',
  },
  {
    label: 'providers',
    icon: CloudIcon,
    href: '/settings/providers',
    regex: /\/settings\/providers(.*)/,
  },
];
