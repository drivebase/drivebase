import { useQuery } from '@apollo/client';
import { Link, useLocation, useRouteContext } from '@tanstack/react-router';
import { ChevronLeftIcon, ChevronsUpDown } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { Avatar, AvatarFallback } from '@drivebase/web/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@drivebase/web/components/ui/dropdown-menu';
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
} from '@drivebase/web/components/ui/sidebar';
import { mainItems, settingsItems } from '@drivebase/web/constants/sidebar.items';
import { GET_ME } from '@drivebase/web/gql/queries/auth';
import { isLanguageRTL } from '@drivebase/web/i18n';

import SidebarUpload from './upload';

const AppSidebar = () => {
  const location = useLocation();
  const { data: me } = useQuery(GET_ME);
  const context = useRouteContext({ from: '/_protected' });
  const { t, i18n } = useTranslation(['common', 'dashboard']);

  const showSettings = location.pathname.startsWith('/settings');
  const currentItems = showSettings ? settingsItems : mainItems;

  return (
    <Sidebar
      className="border-transparent w-[15rem]"
      side={isLanguageRTL(i18n.language) ? 'right' : 'left'}
    >
      <SidebarHeader className="z-10 space-y-4 justify-between">
        <div className="flex justify-between items-start">
          <img
            draggable={false}
            src="/drivebase.png"
            alt="logo"
            height={40}
            width={40}
            className="rounded-xl"
          />
          <span className="text-xs font-medium">{context.version}</span>
        </div>
        <SidebarUpload />
      </SidebarHeader>

      <SidebarContent className="z-10">
        <SidebarGroup>
          <SidebarGroupLabel className="flex items-center">
            {showSettings && (
              <Link to={'/'} className="mr-2 hover:text-primary">
                <ChevronLeftIcon className="w-4 h-4" />
              </Link>
            )}
            {showSettings ? t('common:settings') : t('common:application')}
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {currentItems.map((item) => {
                const isActive = item.regex
                  ? item.regex.test(location.pathname)
                  : item.href === location.pathname;
                const Icon = item.icon;
                return (
                  <SidebarMenuItem key={item.label}>
                    <SidebarMenuButton asChild isActive={isActive}>
                      <Link to={item.href}>
                        <Icon />
                        <span>{t(`dashboard:${item.label}`)}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="z-10">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton
              size="lg"
              className="data-[state=open]:bg-transparent data-[state=open]:text-sidebar-accent-foreground hover:bg-transparent"
            >
              <div className="flex aspect-square size-8 items-center justify-center">
                <Avatar className="w-8 h-8 select-none">
                  <AvatarFallback className="bg-primary text-accent">
                    {me?.me?.name?.charAt(0)}
                  </AvatarFallback>
                </Avatar>
              </div>
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-semibold">{me?.me?.name}</span>
                <span className="truncate text-xs">{me?.me?.email}</span>
              </div>
              <ChevronsUpDown className="ml-auto" />
            </SidebarMenuButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-[200px]">
            <DropdownMenuLabel>{t('common:my_account')}</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem>{t('common:profile')}</DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link to="/settings">{t('common:settings')}</Link>
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => {
                // logout();
              }}
            >
              {t('common:logout')}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarFooter>

      <div className="absolute inset-0 z-0 overflow-hidden">
        <div className="pointer-events-none absolute -left-2/3 bottom-0 aspect-square w-[140%] translate-y-1/4 rounded-full bg-[conic-gradient(from_32deg_at_center,#855AFC_0deg,#3A8BFD_72deg,#00FFF9_144deg,#5CFF80_198deg,#EAB308_261deg,#f00_360deg)] opacity-15 blur-[75px]" />
      </div>
    </Sidebar>
  );
};

export default AppSidebar;
