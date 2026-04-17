import { Button } from "@/components/ui/button";
import type { AvailableProvider } from "@/gql/graphql";
import { ProviderIcon } from "./ProviderIcon";

interface ProviderCardProps {
  provider: AvailableProvider;
  onConnect: (provider: AvailableProvider) => void;
}

export function ProviderCard({ provider, onConnect }: ProviderCardProps) {
  return (
    <div className="flex items-center gap-3 px-5 py-2.5 hover:bg-muted/50 transition-colors cursor-default">
      <ProviderIcon type={provider.type} size={20} />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium">{provider.label}</p>
        <p className="text-xs text-muted-foreground truncate">{provider.description}</p>
      </div>
      <Button size="sm" variant="outline" className="shrink-0" onClick={() => onConnect(provider)}>
        Connect
      </Button>
    </div>
  );
}
