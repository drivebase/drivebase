import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { Button } from "@heroui/react";
import { ArrowLeft, KeyRound, Settings } from "lucide-react";

const settingsNavItems = [
  { to: "/settings/general", label: "General", icon: Settings },
  { to: "/settings/oauth-apps", label: "OAuth Apps", icon: KeyRound },
];

export function SettingsSidebar() {
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  return (
    <aside className="w-60 h-full flex flex-col bg-surface">
      <div className="px-3 h-14 flex items-center shrink-0">
        <Button variant="text" onPress={() => navigate({ to: "/" })} className="gap-2 text-muted">
          <ArrowLeft size={16} />
          Back
        </Button>
      </div>

      <div className="px-5 pb-3">
        <span className="text-xs font-semibold text-muted uppercase tracking-wider">
          Settings
        </span>
      </div>

      <nav className="flex-1 px-2 space-y-0.5 overflow-y-auto">
        {settingsNavItems.map(({ to, label, icon: Icon }) => {
          const active = pathname.startsWith(to);
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
