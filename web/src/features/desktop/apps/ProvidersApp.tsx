import { useQuery } from "urql";
import { Loader2, Plus } from "lucide-react";
import { AvailableProvidersQuery } from "@/features/providers/queries";
import { ProviderCard } from "@/features/providers/ProviderCard";
import { useDesktop } from "@/features/desktop/hooks/use-desktop";
import type { AvailableProvider } from "@/gql/graphql";

interface ProvidersAppProps {
  windowId: string;
}

export function ProvidersApp({ windowId: _ }: ProvidersAppProps) {
  const desktop = useDesktop();

  const [{ data, fetching }] = useQuery({ query: AvailableProvidersQuery });
  const available = data?.availableProviders ?? [];

  function openConnectWindow(provider: AvailableProvider) {
    desktop.openApp("connect-provider", {
      appState: { provider: provider as unknown as Record<string, unknown> },
    });
  }

  if (fetching) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 size={20} className="animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (available.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-2 text-center">
        <Plus size={24} className="text-muted-foreground" />
        <p className="text-sm text-muted-foreground">No providers available</p>
      </div>
    );
  }

  return (
    <div className="py-1">
      {available.map((provider, i) => (
        <div key={provider.type}>
          {i > 0 && <div className="h-px bg-border" />}
          <ProviderCard provider={provider} onConnect={openConnectWindow} />
        </div>
      ))}
    </div>
  );
}
