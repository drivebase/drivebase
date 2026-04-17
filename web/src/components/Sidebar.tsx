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
import { WorkspaceSwitcher } from "./WorkspaceSwitcher";

const navItems: { to: string; label: string; icon: React.ElementType; exact?: boolean }[] = [
  { to: "/", label: "Home", icon: Home, exact: true },
  { to: "/providers", label: "Providers", icon: Database },
  { to: "/files", label: "All files", icon: FolderOpen },
  { to: "/private", label: "Private files", icon: FolderLock },
  { to: "/shared", label: "Shared with me", icon: UserRoundPlus },
  { to: "/trash", label: "Deleted files", icon: Trash2 },
  { to: "/settings", label: "Settings", icon: Settings },
];

export function Sidebar() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  function isActive(to: string, exact?: boolean) {
    return exact ? pathname === to : pathname.startsWith(to);
  }

  return (
    <aside className="w-60 h-full flex flex-col bg-surface">
      {/* Branding */}
      <div className="px-4 h-14 flex items-center gap-2 shrink-0">
        <img src="/logo.svg" className="size-6 rounded" alt="Drivebase" />
        <span className="font-semibold text-sm text-foreground">Drivebase</span>
      </div>

      {/* Workspace switcher */}
      <div className="px-2 pb-2">
        <WorkspaceSwitcher />
      </div>

      {/* Nav */}
      <nav className="flex-1 px-2 py-2 space-y-0.5 overflow-y-auto">
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
    </aside>
  );
}
