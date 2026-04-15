import { Link, useRouterState } from "@tanstack/react-router";
import type React from "react";
import {
  Database,
  FolderLock,
  FolderOpen,
  Home,
  Settings,
  Trash2,
  UserRoundPlus,
} from "lucide-react";
import { UserProfile } from "./UserProfile";
import { WorkspaceSwitcher } from "./WorkspaceSwitcher";

const navItems = [
  { to: "/", label: "Home", icon: Home, exact: true },
  { to: "/providers", label: "Providers", icon: Database },
  { to: "/files", label: "All files", icon: FolderOpen },
  { to: "/private", label: "Private files", icon: FolderLock },
  { to: "/shared", label: "Shared with me", icon: UserRoundPlus },
  { to: "/trash", label: "Deleted files", icon: Trash2 },
  { to: "/settings", label: "Settings", icon: Settings },
];

const bottomItems: { to: string; label: string; icon: React.ElementType }[] = [];

export function Sidebar() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  function isActive(to: string, exact?: boolean) {
    return exact ? pathname === to : pathname.startsWith(to);
  }

  return (
    <aside className="w-60 shrink-0 h-screen flex flex-col bg-surface">
      {/*<div className="px-5 pt-3 flex items-center gap-2">
        <img src="/logo.svg" className="size-8 rounded-md" />
      </div>*/}
      
      {/*Workspace header */}
      <div className="px-2 pt-3">
        <WorkspaceSwitcher />
      </div>

      {/* Nav */}
      <nav className="flex-1 px-2 py-3 space-y-0.5 overflow-y-auto">
        {navItems.map(({ to, label, icon: Icon, exact }) => {
          const active = isActive(to, exact);
          return (
            <Link
              key={to}
              to={to}
              className={[
                "flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors",
                active
                  ? "bg-default text-foreground font-semibold"
                  : "text-muted hover:bg-default/50 hover:text-foreground",
              ].join(" ")}
            >
              <Icon size={18} strokeWidth={active ? 2 : 1.5} />
              {label}
            </Link>
          );
        })}
      </nav>

      {/* Bottom */}
      <div className="px-2 py-3 space-y-0.5">
        {bottomItems.map(({ to, label, icon: Icon }) => {
          const active = isActive(to);
          return (
            <Link
              key={to}
              to={to}
              className={[
                "flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors",
                active
                  ? "bg-default text-foreground font-semibold"
                  : "text-muted hover:bg-default/50 hover:text-foreground",
              ].join(" ")}
            >
              <Icon size={18} strokeWidth={active ? 2 : 1.5} />
              {label}
            </Link>
          );
        })}
        <UserProfile />
      </div>
    </aside>
  );
}
