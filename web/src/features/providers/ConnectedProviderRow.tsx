import { MoreHorizontal, RefreshCw, Trash2 } from "lucide-react";
import { useMutation } from "urql";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { DisconnectProviderMutation } from "./mutations";
import type { Provider } from "@/gql/graphql";
import { ProviderStatus } from "@/gql/graphql";
import { ProviderIcon } from "./ProviderIcon";

const STATUS_DOT: Record<ProviderStatus, string> = {
  [ProviderStatus.Active]: "bg-green-500",
  [ProviderStatus.Error]: "bg-red-500",
  [ProviderStatus.Pending]: "bg-yellow-500",
};

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 ** 2) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 ** 3) return `${(bytes / 1024 ** 2).toFixed(1)} MB`;
  return `${(bytes / 1024 ** 3).toFixed(1)} GB`;
}

interface ConnectedProviderRowProps {
  provider: Provider;
  onDisconnect: () => void;
}

export function ConnectedProviderRow({ provider, onDisconnect }: ConnectedProviderRowProps) {
  const [{ fetching }, disconnect] = useMutation(DisconnectProviderMutation);
  const dot = STATUS_DOT[provider.status];

  async function handleDisconnect() {
    await disconnect({ id: provider.id });
    onDisconnect();
  }

  return (
    <div className="flex items-center gap-3 px-5 py-2.5 hover:bg-muted/50 transition-colors cursor-default">
      <ProviderIcon type={provider.type} size={16} />

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium truncate">{provider.name}</span>
          <span className={`h-1.5 w-1.5 rounded-full shrink-0 ${dot}`} />
        </div>
        {provider.quota && (
          <p className="text-xs text-muted-foreground mt-0.5">
            {formatBytes(provider.quota.totalBytes - provider.quota.freeBytes)} / {formatBytes(provider.quota.totalBytes)} used
          </p>
        )}
      </div>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0">
            <MoreHorizontal size={15} />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-44">
          <DropdownMenuItem>
            <RefreshCw size={14} />
            Sync now
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            className="text-destructive focus:text-destructive"
            disabled={fetching}
            onSelect={handleDisconnect}
          >
            <Trash2 size={14} />
            Disconnect
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
