import { useNavigate } from "@tanstack/react-router";
import { Bell, LogOut, Power, PowerCircle, PowerOff, Settings2, X } from "lucide-react";
import { toast } from "sonner";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { useAppUpdate } from "@/hooks/useAppUpdate";
import { useLogout } from "@/hooks/useAuth";
import { useAuthStore } from "@/store/authStore";
import { useRightPanelStore } from "@/store/rightPanelStore";

function DefaultAccountView() {
  const user = useAuthStore((state) => state.user);
  const clearAuth = useAuthStore((state) => state.logout);
  const navigate = useNavigate();
  const [, logout] = useLogout();
  const { currentVersion } = useAppUpdate();

  if (!user) return null;

  const userName = user.name?.trim() || user.email.split("@")[0];
  const userInitial = userName.charAt(0).toUpperCase();

  const handleSignOut = async () => {
    try {
      await logout();
    } catch (error) {
      toast.error("Unable to sign out from server. Signing out locally.");
    } finally {
      clearAuth();
      navigate({ to: "/login", replace: true });
    }
  };

  return (
    <>
      <div className="flex flex-col items-center gap-4">
        <div className="relative">
          <Avatar className="w-24 h-24 border-4 border-background">
            <AvatarImage src={`https://ui-avatars.com/api/?name=${userName}`} />
            <AvatarFallback>{userInitial}</AvatarFallback>
          </Avatar>
        </div>
        <div className="text-center">
          <h2 className="text-xl font-bold text-foreground">{userName}</h2>
          <p className="text-sm text-muted-foreground">{user.email}</p>
        </div>
        <p className="text-xs text-muted-foreground mt-1">v{currentVersion}</p>
        <Button
          className="w-full"
          size='lg'
          variant={'outline'}
          onClick={() => navigate({ to: "/my-account" })}
        >
          <Settings2 size={16} className="mr-2" />
          My Account
        </Button>
      </div>

      <Separator />

      <div className="flex-1 overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold flex items-center gap-2">
            <Bell size={18} />
            Activity
          </h3>
        </div>
        <div className="space-y-4">
          <div className="text-sm text-muted-foreground text-center py-8">No recent activity</div>
        </div>
      </div>
    </>
  );
}

export function RightPanel() {
  const user = useAuthStore((state) => state.user);
  const content = useRightPanelStore((state) => state.content);
  const clearContent = useRightPanelStore((state) => state.clearContent);

  if (!user) return null;

  return (
    <div className="w-80 p-6 flex flex-col gap-8 shrink-0 relative">
      {content ? (
        <>
          <div className="flex items-center justify-end">
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={clearContent}>
              <X className="h-4 w-4" />
              <span className="sr-only">Close panel</span>
            </Button>
          </div>
          <div className="-mt-4 flex-1 overflow-y-auto">{content}</div>
        </>
      ) : (
        <DefaultAccountView />
      )}
    </div>
  );
}
