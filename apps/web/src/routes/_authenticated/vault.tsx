import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { VaultFileBrowser } from "@/features/vault/components/VaultFileBrowser";
import { VaultSetupWizard } from "@/features/vault/components/VaultSetupWizard";
import { VaultUnlockPrompt } from "@/features/vault/components/VaultUnlockPrompt";
import { useMyVault, useVaultContents } from "@/features/vault/hooks/useVault";
import { useVaultStore } from "@/features/vault/store/vaultStore";

const searchSchema = z.object({
	path: z.string().optional().catch(undefined),
});

export const Route = createFileRoute("/_authenticated/vault")({
	validateSearch: (search) => searchSchema.parse(search),
	component: VaultPage,
});

function VaultPage() {
	const { path: searchPath } = Route.useSearch();
	const navigate = Route.useNavigate();
	const { isUnlocked } = useVaultStore();

	const [{ data, fetching }] = useMyVault();
	const currentPath = searchPath ?? "/";

	const [{ data: contentsData, fetching: contentsFetching }, refreshContents] =
		useVaultContents(currentPath);

	const handleNavigate = (path: string) => {
		navigate({ search: { path } });
	};

	const handleRefresh = () => {
		refreshContents({ requestPolicy: "network-only" });
	};

	if (fetching) {
		return (
			<div className="flex items-center justify-center h-full">
				<div className="text-muted-foreground text-sm">Loading...</div>
			</div>
		);
	}

	// Vault not set up yet — show onboarding wizard
	if (!data?.myVault) {
		return (
			<div className="flex items-center justify-center h-full">
				<VaultSetupWizard onComplete={() => window.location.reload()} />
			</div>
		);
	}

	// Vault exists but key not in memory — show unlock prompt
	if (!isUnlocked) {
		return (
			<div className="flex items-center justify-center h-full">
				<VaultUnlockPrompt onUnlocked={handleRefresh} />
			</div>
		);
	}

	// Vault unlocked — show file browser
	return (
		<VaultFileBrowser
			currentPath={currentPath}
			contents={contentsData?.vaultContents}
			isFetching={contentsFetching}
			onNavigate={handleNavigate}
			onRefresh={handleRefresh}
		/>
	);
}
