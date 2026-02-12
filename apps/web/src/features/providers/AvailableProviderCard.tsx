import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
	Card,
} from "@/components/ui/card";

import type { AvailableProvider } from "@/gql/graphql";
import { ProviderIcon } from "./ProviderIcon";

interface AvailableProviderCardProps {
  provider: AvailableProvider;
  onConnect: (provider: AvailableProvider) => void;
}

export function AvailableProviderCard({
  provider,
  onConnect,
}: AvailableProviderCardProps) {
  return (
    <Card
      className="group relative overflow-hidden transition-all flex flex-col items-center text-center p-6 gap-4"
      onClick={() => onConnect(provider)}
    >
      <div className="rounded-full bg-primary/10 p-4">
        <ProviderIcon type={provider.id} className="h-8 w-8" />
      </div>

      <div className="space-y-1">
        <h3 className="font-semibold text-lg">{provider.name}</h3>
        <p className="text-sm text-muted-foreground line-clamp-2">
          {provider.description}
        </p>
      </div>

      <Button
        variant="outline"
        className="w-full mt-auto"
      >
        <Plus className="h-4 w-4 mr-2" />
        Connect
      </Button>
    </Card>
  );
}
