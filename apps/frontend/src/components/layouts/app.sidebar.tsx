'use client';

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from '@xilehq/ui/components/sidebar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@xilehq/ui/components/dropdown-menu';
import {
  LayoutDashboardIcon,
  SettingsIcon,
  StarIcon,
  TrashIcon,
} from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import SidebarUpload from './upload';
import { Avatar, AvatarFallback } from '@xilehq/ui/components/avatar';
import { useAppSelector } from '@xilehq/ui/lib/redux/hooks';

const items = [
  {
    label: 'Dashboard',
    icon: <LayoutDashboardIcon />,
    href: '/',
  },
  {
    label: 'Favorites',
    icon: <StarIcon />,
    href: '/favorites',
  },
  {
    label: 'Recycle Bin',
    icon: <TrashIcon />,
    href: '/recycle-bin',
  },
  {
    label: 'Settings',
    icon: <SettingsIcon />,
    href: '/settings',
  },
];

const AppSidebar = () => {
  const pathname = usePathname();
  const profile = useAppSelector((s) => s.profile.user);

  return (
    <Sidebar className="border-transparent w-[15rem]">
      <SidebarHeader className="z-10 space-y-4 pt-4 justify-between">
        <div className="flex justify-between items-start">
          <Image
            draggable={false}
            src="/xile.png"
            alt="logo"
            width={40}
            height={40}
            className="rounded-xl"
          />
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Avatar className="w-8 h-8 select-none">
                <AvatarFallback className="bg-orange-500 text-primary-foreground">
                  {profile?.name?.charAt(0)}
                </AvatarFallback>
              </Avatar>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuLabel>My Account</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem>Profile</DropdownMenuItem>
              <DropdownMenuItem>Billing</DropdownMenuItem>
              <DropdownMenuItem>Team</DropdownMenuItem>
              <DropdownMenuItem>Subscription</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        <SidebarUpload />
      </SidebarHeader>
      <SidebarContent className="z-10">
        <SidebarGroup>
          <SidebarGroupLabel>Application</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {items.map((item) => {
                const isActive = pathname === item.href;
                return (
                  <SidebarMenuItem key={item.label}>
                    <SidebarMenuButton asChild isActive={isActive}>
                      <Link href={item.href}>
                        {item.icon}
                        <span>{item.label}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="z-10" />

      <div className="absolute inset-0 z-0 overflow-hidden">
        <div className="pointer-events-none absolute -left-2/3 bottom-0 aspect-square w-[140%] translate-y-1/4 rounded-full bg-[conic-gradient(from_32deg_at_center,#855AFC_0deg,#3A8BFD_72deg,#00FFF9_144deg,#5CFF80_198deg,#EAB308_261deg,#f00_360deg)] opacity-15 blur-[75px]" />
      </div>
    </Sidebar>
  );
};

export default AppSidebar;
