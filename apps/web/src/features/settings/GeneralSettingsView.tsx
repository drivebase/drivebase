import { msg } from "@lingui/macro";
import { useLingui } from "@lingui/react";
import { Trans } from "@lingui/react/macro";
import { useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useLogout } from "@/features/auth/hooks/useAuth";
import { useAuthStore } from "@/features/auth/store/authStore";
import { FileManagementSettingsSection } from "@/features/settings/sections/FileManagementSettingsSection";
import { PreferencesSettingsSection } from "@/features/settings/sections/PreferencesSettingsSection";
import { WorkspaceNameSection } from "@/features/settings/sections/WorkspaceNameSection";
import {
	getActiveWorkspaceId,
	useUpdateWorkspaceSyncOperations,
	useUpdateWorkspaceName,
	useWorkspaceMembers,
	useWorkspaces,
} from "@/features/workspaces";
import { WorkspaceMemberRole } from "@/gql/graphql";

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
	const [updateWorkspaceSyncResult, updateWorkspaceSyncOperations] =
		useUpdateWorkspaceSyncOperations();
	const [workspaceName, setWorkspaceName] = useState("");

	useEffect(() => {
		setWorkspaceName(activeWorkspace?.name ?? "");
	}, [activeWorkspace?.name]);

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

	const handleSignOut = async () => {
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

	const handleUpdateWorkspaceSync = async (enabled: boolean) => {
		if (!workspaceId || !canManageWorkspace) {
			return;
		}

		const result = await updateWorkspaceSyncOperations({
			input: {
				workspaceId,
				enabled,
			},
		});

		if (result.error || !result.data?.updateWorkspaceSyncOperations) {
			toast.error(result.error?.message ?? "Failed to update sync setting");
			return;
		}

		toast.success(enabled ? "Sync enabled" : "Sync disabled");
		reexecuteWorkspaces({ requestPolicy: "network-only" });
	};

	return (
		<div className="space-y-8">
			{activeWorkspace ? (
				<>
					<WorkspaceNameSection
						name={workspaceName}
						canEdit={canManageWorkspace}
						isSaving={updateWorkspaceNameResult.fetching}
						onNameChange={setWorkspaceName}
						onSave={handleUpdateWorkspaceName}
					/>
					<div className="border-t border-border" />
				</>
			) : null}
			<PreferencesSettingsSection />
			<div className="border-t border-border" />
			{activeWorkspace ? (
				<FileManagementSettingsSection
					syncEnabled={activeWorkspace.syncOperationsToProvider}
					canEdit={canManageWorkspace}
					isSaving={updateWorkspaceSyncResult.fetching}
					onSyncToggle={handleUpdateWorkspaceSync}
				/>
			) : null}
			<div className="border-t border-border pt-6">
				<Button variant="outline" onClick={handleSignOut}>
					<Trans>Sign out</Trans>
				</Button>
			</div>
		</div>
	);
}
