import { ExternalLink, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

import type { AvailableProvider } from "@/gql/graphql";
import { ProviderIcon } from "./ProviderIcon";

interface AvailableProviderCardProps {
	provider: AvailableProvider;
	onConnect: (provider: AvailableProvider) => void;
	canManageProviders: boolean;
}

function getProviderDocsUrl(providerId: string): string {
	const path = providerId.toLowerCase().replaceAll("_", "-");
	return `https://drivebase.io/docs/storage-providers/${path}`;
}

export function AvailableProviderCard({
	provider,
	onConnect,
	canManageProviders,
}: AvailableProviderCardProps) {
	return (
		<Card className="group relative overflow-hidden transition-all flex flex-col items-center text-center p-6 gap-4">
			<Button
				variant="ghost"
				size="icon"
				className="absolute right-3 top-3"
				asChild
			>
				<a
					href={getProviderDocsUrl(provider.id)}
					target="_blank"
					rel="noopener noreferrer"
					aria-label={`Open ${provider.name} docs`}
				>
					<ExternalLink className="h-4 w-4" />
				</a>
			</Button>

			<div className=" bg-primary/10 p-4">
				<ProviderIcon type={provider.id} className="h-8 w-8" />
			</div>

			<div className="space-y-1">
				<h3 className="font-semibold text-lg">{provider.name}</h3>
				<p className="text-sm text-muted-foreground line-clamp-2">
					{provider.description}
				</p>
			</div>

			{canManageProviders ? (
				<div className="w-full">
					<Button
						variant="outline"
						className="w-full"
						onClick={() => onConnect(provider)}
					>
						<Plus className="h-4 w-4 mr-2" />
						Connect
					</Button>
				</div>
			) : null}
		</Card>
	);
}
