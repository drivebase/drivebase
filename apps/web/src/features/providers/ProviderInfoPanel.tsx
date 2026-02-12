import { format } from "date-fns";
import { Loader2, Shield } from "lucide-react";
import { ProviderIcon } from "@/features/providers/ProviderIcon";
import { useProvider } from "@/hooks/useProviders";

interface ProviderInfoPanelProps {
  providerId: string;
}

export function ProviderInfoPanel({ providerId }: ProviderInfoPanelProps) {
  const { data, fetching, error } = useProvider(providerId);
  const provider = data?.storageProvider;

  if (fetching) {
    return (
      <div className="h-full flex items-center justify-center text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin mr-2" />
        Loading provider details...
      </div>
    );
  }

  if (error || !provider) {
    return <div className="text-sm text-destructive">Failed to load provider details.</div>;
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <div className="rounded-md bg-muted p-2">
          <ProviderIcon type={provider.type} className="h-6 w-6" />
        </div>
        <div>
          <h3 className="text-base font-semibold">{provider.name}</h3>
          <p className="text-xs text-muted-foreground uppercase tracking-wide">{provider.type.replace("_", " ")}</p>
        </div>
      </div>

      {provider.accountEmail || provider.accountName ? (
        <div className="space-y-2 rounded-md border p-3">
          <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Connected Account</div>
          {provider.accountName ? <div className="text-sm">{provider.accountName}</div> : null}
          {provider.accountEmail ? <div className="text-sm text-muted-foreground">{provider.accountEmail}</div> : null}
        </div>
      ) : null}

      <div className="space-y-2">
        <div className="text-xs border-b pb-2 font-semibold text-muted-foreground uppercase tracking-wide">Provider Configuration</div>
        <div className="space-y-4">
          {provider.configPreview.map((entry: { key: string; value: string; isSensitive: boolean }) => (
            <div key={entry.key} className="flex flex-col gap-2 text-sm">
              <h1 className="text-muted-foreground">{entry.key}</h1>
              <span className="break-all font-mono">
                {entry.value}
                {entry.isSensitive ? <Shield className="inline h-3.5 w-3.5 ml-1 text-muted-foreground" /> : null}
              </span>
            </div>
          ))}
        </div>
      </div>

      <div className="text-xs text-muted-foreground">
        Last synced: {provider.lastSyncAt ? format(new Date(provider.lastSyncAt), "MMM dd, yyyy HH:mm") : "Never"}
      </div>
    </div>
  );
}
