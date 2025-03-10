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
} from '@drivebase/react/components/sidebar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@drivebase/react/components/dropdown-menu';
import { ChevronLeftIcon } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Avatar, AvatarFallback } from '@drivebase/react/components/avatar';
import { useAppSelector } from '@drivebase/react/lib/redux/hooks';
import {
  mainItems,
  settingsItems,
} from '@drivebase/frontend/constants/sidebar.items';
import SidebarUpload from './upload';

const AppSidebar = () => {
  const pathname = usePathname();
  const profile = useAppSelector((s) => s.profile.user);

  const showSettings = pathname.startsWith('/settings');
  const currentItems = showSettings ? settingsItems : mainItems;

  return (
    <Sidebar className="border-transparent w-[15rem]">
      <SidebarHeader className="z-10 space-y-4 pt-4 justify-between">
        <div className="flex justify-between items-start">
          <Image
            draggable={false}
            src="/drivebase.png"
            alt="logo"
            height={40}
            width={40}
            className="rounded-xl"
          />
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Avatar className="w-8 h-8 select-none">
                <AvatarFallback className="bg-accent-foreground text-accent">
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
          <SidebarGroupLabel className="flex items-center">
            {showSettings && (
              <Link href={'/'} className="mr-2 hover:text-primary">
                <ChevronLeftIcon className="w-4 h-4" />
              </Link>
            )}
            {showSettings ? 'Settings' : 'Application'}
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {currentItems.map((item) => {
                const isActive = pathname === item.href;
                const Icon = item.icon;
                return (
                  <SidebarMenuItem key={item.label}>
                    <SidebarMenuButton asChild isActive={isActive}>
                      <Link href={item.href}>
                        <Icon />
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
