import { msg } from "@lingui/macro";
import { useLingui } from "@lingui/react";
import { Trans } from "@lingui/react/macro";
import { useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { PiSignOutLight } from "react-icons/pi";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useLogout } from "@/features/auth/hooks/useAuth";
import { useAuthStore } from "@/features/auth/store/authStore";
import { useProviders } from "@/features/providers/hooks/useProviders";
import { SmartSearchSection } from "@/features/settings/sections/SmartSearchSection";
import { WorkspaceAutoSyncSection } from "@/features/settings/sections/WorkspaceAutoSyncSection";
import { WorkspaceNameSection } from "@/features/settings/sections/WorkspaceNameSection";
import {
	getActiveWorkspaceId,
	useUpdateWorkspaceAutoSync,
	useUpdateWorkspaceName,
	useUpdateWorkspaceSmartSearch,
	useWorkspaceMembers,
	useWorkspaces,
} from "@/features/workspaces";
import { WorkspaceAutoSyncScope, WorkspaceMemberRole } from "@/gql/graphql";
import { confirmDialog } from "@/shared/lib/confirmDialog";

export function GeneralSettingsView() {
	const { i18n } = useLingui();
	const navigate = useNavigate();
	const [, logout] = useLogout();
	const clearAuth = useAuthStore((state) => state.logout);

	const [workspacesResult, reexecuteWorkspaces] = useWorkspaces(false);
	const currentUserId = useAuthStore((state) => state.user?.id ?? null);
	const activeWorkspaceId = getActiveWorkspaceId();

	const activeWorkspace = useMemo(() => {
		const workspaces = workspacesResult.data?.workspaces ?? [];
		if (workspaces.length === 0) {
			return null;
		}

		return (
			workspaces.find((workspace) => workspace.id === activeWorkspaceId) ??
			workspaces[0] ??
			null
		);
	}, [workspacesResult.data?.workspaces, activeWorkspaceId]);

	const workspaceId = activeWorkspace?.id ?? "";
	const [membersResult] = useWorkspaceMembers(workspaceId, !workspaceId);

	const currentWorkspaceRole = useMemo(() => {
		if (!currentUserId) {
			return null;
		}

		const members = membersResult.data?.workspaceMembers ?? [];
		const currentMember = members.find(
			(member) => member.userId === currentUserId,
		);
		return currentMember?.role ?? null;
	}, [currentUserId, membersResult.data?.workspaceMembers]);

	const canManageWorkspace =
		currentWorkspaceRole === WorkspaceMemberRole.Owner ||
		currentWorkspaceRole === WorkspaceMemberRole.Admin;

	const [updateWorkspaceNameResult, updateWorkspaceName] =
		useUpdateWorkspaceName();
	const [updateSmartSearchResult, updateSmartSearch] =
		useUpdateWorkspaceSmartSearch();
	const [updateAutoSyncResult, updateAutoSync] = useUpdateWorkspaceAutoSync();
	const providersResult = useProviders();
	const [workspaceName, setWorkspaceName] = useState("");
	const [autoSyncEnabled, setAutoSyncEnabled] = useState(false);
	const [autoSyncCron, setAutoSyncCron] = useState("0 * * * *");
	const [autoSyncScope, setAutoSyncScope] = useState<WorkspaceAutoSyncScope>(
		WorkspaceAutoSyncScope.All,
	);
	const [autoSyncProviderIds, setAutoSyncProviderIds] = useState<string[]>([]);

	useEffect(() => {
		setWorkspaceName(activeWorkspace?.name ?? "");
	}, [activeWorkspace?.name]);

	useEffect(() => {
		setAutoSyncEnabled(activeWorkspace?.autoSyncEnabled ?? false);
		setAutoSyncCron(activeWorkspace?.autoSyncCron ?? "0 * * * *");
		setAutoSyncScope(
			activeWorkspace?.autoSyncScope ?? WorkspaceAutoSyncScope.All,
		);
		setAutoSyncProviderIds(activeWorkspace?.autoSyncProviderIds ?? []);
	}, [
		activeWorkspace?.autoSyncEnabled,
		activeWorkspace?.autoSyncCron,
		activeWorkspace?.autoSyncProviderIds,
		activeWorkspace?.autoSyncScope,
	]);

	const handleUpdateWorkspaceName = async () => {
		if (!workspaceId || !canManageWorkspace) {
			return;
		}

		const trimmedName = workspaceName.trim();
		if (!trimmedName) {
			toast.error("Workspace name is required");
			return;
		}

		const result = await updateWorkspaceName({
			input: {
				workspaceId,
				name: trimmedName,
			},
		});

		if (result.error || !result.data?.updateWorkspaceName) {
			toast.error(result.error?.message ?? "Failed to update workspace name");
			return;
		}

		toast.success("Workspace name updated");
		reexecuteWorkspaces({ requestPolicy: "network-only" });
	};

	const handleToggleSmartSearch = async (enabled: boolean) => {
		if (!workspaceId || !canManageWorkspace) {
			return;
		}

		const result = await updateSmartSearch({
			input: { workspaceId, enabled },
		});

		if (result.error || !result.data?.updateWorkspaceSmartSearch) {
			toast.error(
				result.error?.message ?? "Failed to update smart search setting",
			);
			return;
		}

		reexecuteWorkspaces({ requestPolicy: "network-only" });
	};

	const handleToggleAutoSyncProvider = (
		providerId: string,
		selected: boolean,
	) => {
		setAutoSyncProviderIds((previous) => {
			if (selected) {
				if (previous.includes(providerId)) return previous;
				return [...previous, providerId];
			}

			return previous.filter((id) => id !== providerId);
		});
	};

	const handleSaveAutoSync = async () => {
		if (!workspaceId || !canManageWorkspace) {
			return;
		}

		const result = await updateAutoSync({
			input: {
				workspaceId,
				enabled: autoSyncEnabled,
				cron: autoSyncEnabled ? autoSyncCron.trim() : null,
				scope: autoSyncScope,
				providerIds:
					autoSyncScope === WorkspaceAutoSyncScope.Selected
						? autoSyncProviderIds
						: [],
			},
		});

		if (result.error || !result.data?.updateWorkspaceAutoSync) {
			toast.error(
				result.error?.message ?? "Failed to update auto sync settings",
			);
			return;
		}

		toast.success("Auto sync settings updated");
		reexecuteWorkspaces({ requestPolicy: "network-only" });
	};

	const handleSignOut = async () => {
		const confirmed = await confirmDialog(
			i18n._(msg`Sign out?`),
			i18n._(msg`You will be returned to the login page.`),
		);
		if (!confirmed) return;

		try {
			await logout();
		} catch (_error) {
			toast.error(
				i18n._(msg`Unable to sign out from server. Signing out locally.`),
			);
		} finally {
			clearAuth();
			navigate({ to: "/login", replace: true });
		}
	};

	return (
		<div className="space-y-8 py-8">
			{activeWorkspace ? (
				<>
					<div className="px-8">
						<WorkspaceNameSection
							name={workspaceName}
							canEdit={canManageWorkspace}
							isSaving={updateWorkspaceNameResult.fetching}
							onNameChange={setWorkspaceName}
							onSave={handleUpdateWorkspaceName}
						/>
					</div>
					<div className="border-t border-border" />
					<div className="px-8">
						<SmartSearchSection
							enabled={activeWorkspace.smartSearchEnabled}
							canEdit={canManageWorkspace}
							isSaving={updateSmartSearchResult.fetching}
							onToggle={handleToggleSmartSearch}
						/>
					</div>
					<div className="border-t border-border" />
					<div className="px-8">
						<WorkspaceAutoSyncSection
							enabled={autoSyncEnabled}
							cron={autoSyncCron}
							scope={autoSyncScope}
							selectedProviderIds={autoSyncProviderIds}
							providers={providersResult.data?.storageProviders ?? []}
							canEdit={canManageWorkspace}
							isSaving={updateAutoSyncResult.fetching}
							onEnabledChange={setAutoSyncEnabled}
							onCronChange={setAutoSyncCron}
							onScopeChange={(scope) =>
								setAutoSyncScope(scope as WorkspaceAutoSyncScope)
							}
							onProviderToggle={handleToggleAutoSyncProvider}
							onSave={handleSaveAutoSync}
						/>
					</div>
					<div className="border-t border-border" />
				</>
			) : null}
			<div className="border-t border-border p-8">
				<Button variant="outline" onClick={handleSignOut}>
					<PiSignOutLight className="mr-1 w-4 h-4" />
					<Trans>Sign out</Trans>
				</Button>
			</div>
		</div>
	);
}
