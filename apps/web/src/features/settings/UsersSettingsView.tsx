import { Trans } from "@lingui/react/macro";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Separator } from "@/components/ui/separator";
import { useAuthStore } from "@/features/auth/store/authStore";
import { useProviders } from "@/features/providers/hooks/useProviders";
import { WorkspaceActiveInvitesSection } from "@/features/settings/sections/WorkspaceActiveInvitesSection";
import { WorkspaceInviteCreateSection } from "@/features/settings/sections/WorkspaceInviteCreateSection";
import { WorkspaceMembersSection } from "@/features/settings/sections/WorkspaceMembersSection";
import {
	getActiveWorkspaceId,
	useAddWorkspaceMemberByEmail,
	useCreateWorkspaceInvite,
	useRemoveWorkspaceMember,
	useRevokeWorkspaceInvite,
	useSetMemberAccessGrants,
	useUpdateWorkspaceMemberRole,
	useWorkspaceInvites,
	useWorkspaceMembers,
	useWorkspaces,
} from "@/features/workspaces";
import { WorkspaceMemberRole } from "@/gql/graphql";

export function UsersSettingsView() {
	const [workspacesResult] = useWorkspaces(false);
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
	const [membersResult, reexecuteMembers] = useWorkspaceMembers(
		workspaceId,
		!workspaceId,
	);

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

	const [invitesResult, reexecuteInvites] = useWorkspaceInvites(
		workspaceId,
		!workspaceId || !canManageWorkspace,
	);
	const workspaceInvites = invitesResult.data?.workspaceInvites ?? [];
	const shouldShowActiveInvitesSection =
		canManageWorkspace &&
		(invitesResult.fetching || workspaceInvites.length > 0);

	const providersResult = useProviders();
	const providers = providersResult.data?.storageProviders ?? [];

	const [, createInvite] = useCreateWorkspaceInvite();
	const [, updateRole] = useUpdateWorkspaceMemberRole();
	const [, removeMember] = useRemoveWorkspaceMember();
	const [, revokeInvite] = useRevokeWorkspaceInvite();
	const [, setAccessGrants] = useSetMemberAccessGrants();
	const [, addByEmail] = useAddWorkspaceMemberByEmail();

	const [inviteRole, setInviteRole] = useState<WorkspaceMemberRole>(
		WorkspaceMemberRole.Viewer,
	);
	const [expiresInDays, setExpiresInDays] = useState(7);
	const [generatedInviteLink, setGeneratedInviteLink] = useState("");
	const [restrictAccess, setRestrictAccess] = useState(false);
	const [selectedProviderIds, setSelectedProviderIds] = useState<string[]>([]);

	const handleProviderToggle = (providerId: string, checked: boolean) => {
		setSelectedProviderIds((prev) =>
			checked ? [...prev, providerId] : prev.filter((id) => id !== providerId),
		);
	};

	const handleCreateInvite = async () => {
		if (!workspaceId || !canManageWorkspace) {
			return;
		}

		const accessGrants =
			restrictAccess && selectedProviderIds.length > 0
				? selectedProviderIds.map((providerId) => ({
						providerId,
						folderPath: null,
					}))
				: [];

		const result = await createInvite({
			input: {
				workspaceId,
				role: inviteRole,
				expiresInDays,
				accessGrants,
			},
		});

		if (result.error || !result.data?.createWorkspaceInvite) {
			toast.error(
				result.error?.message ?? <Trans>Failed to create invite link</Trans>,
			);
			return;
		}

		const inviteUrl = `${window.location.origin}/join-workspace?token=${result.data.createWorkspaceInvite.token}`;
		setGeneratedInviteLink(inviteUrl);
		toast.success(<Trans>Invite link created</Trans>);
		reexecuteInvites({ requestPolicy: "network-only" });
	};

	const copyInviteLink = async (link: string) => {
		try {
			await navigator.clipboard.writeText(link);
			toast.success(<Trans>Invite link copied</Trans>);
		} catch {
			toast.error(<Trans>Could not copy invite link</Trans>);
		}
	};

	const handleUpdateRole = async (
		userId: string,
		role: WorkspaceMemberRole,
	) => {
		if (!workspaceId || !canManageWorkspace) {
			return;
		}

		const result = await updateRole({
			input: {
				workspaceId,
				userId,
				role,
			},
		});

		if (result.error || !result.data?.updateWorkspaceMemberRole) {
			toast.error(
				result.error?.message ?? <Trans>Failed to update member role</Trans>,
			);
			return;
		}

		toast.success(<Trans>Member role updated</Trans>);
		reexecuteMembers({ requestPolicy: "network-only" });
	};

	const handleRemoveMember = async (userId: string) => {
		if (!workspaceId || !canManageWorkspace) {
			return;
		}

		const result = await removeMember({ workspaceId, userId });
		if (result.error || !result.data?.removeWorkspaceMember) {
			toast.error(
				result.error?.message ?? <Trans>Failed to remove member</Trans>,
			);
			return;
		}

		toast.success(<Trans>Member removed</Trans>);
		reexecuteMembers({ requestPolicy: "network-only" });
	};

	const handleRevokeInvite = async (inviteId: string) => {
		if (!workspaceId || !canManageWorkspace) {
			return;
		}

		const result = await revokeInvite({ workspaceId, inviteId });
		if (result.error || !result.data?.revokeWorkspaceInvite) {
			toast.error(
				result.error?.message ?? <Trans>Failed to revoke invite</Trans>,
			);
			return;
		}

		toast.success(<Trans>Invite revoked</Trans>);
		reexecuteInvites({ requestPolicy: "network-only" });
	};

	const handleAddByEmail = async (
		email: string,
		role: WorkspaceMemberRole,
		grants: Array<{ providerId: string; folderPath?: string | null }>,
	) => {
		if (!workspaceId || !canManageWorkspace) return;

		const result = await addByEmail({
			workspaceId,
			email,
			role,
			accessGrants: grants.map((g) => ({
				providerId: g.providerId,
				folderPath: g.folderPath ?? null,
			})),
		});

		if (result.error || !result.data?.addWorkspaceMemberByEmail) {
			toast.error(result.error?.message ?? <Trans>Failed to add member</Trans>);
			return;
		}

		toast.success(<Trans>Member added</Trans>);
		reexecuteMembers({ requestPolicy: "network-only" });
	};

	const handleSetAccessGrants = async (
		userId: string,
		grants: Array<{ providerId: string; folderPath?: string | null }>,
	) => {
		if (!workspaceId) return;

		const result = await setAccessGrants({
			workspaceId,
			userId,
			grants: grants.map((g) => ({
				providerId: g.providerId,
				folderPath: g.folderPath ?? null,
			})),
		});

		if (result.error || !result.data?.setMemberAccessGrants) {
			toast.error(
				result.error?.message ?? <Trans>Failed to update access grants</Trans>,
			);
			return;
		}

		toast.success(<Trans>Access updated</Trans>);
		reexecuteMembers({ requestPolicy: "network-only" });
	};

	if (!activeWorkspace) {
		return (
			<div className="space-y-2">
				<h3 className="text-lg font-medium">
					<Trans>Users</Trans>
				</h3>
				<p className="text-sm text-muted-foreground">
					<Trans>No workspace selected.</Trans>
				</p>
			</div>
		);
	}

	return (
		<div className="space-y-8">
			<div className="px-8 pt-8">
				<WorkspaceMembersSection
					members={membersResult.data?.workspaceMembers ?? []}
					isLoading={membersResult.fetching}
					canManageWorkspace={canManageWorkspace}
					providers={providers}
					onUpdateRole={handleUpdateRole}
					onRemoveMember={handleRemoveMember}
					onSetAccessGrants={handleSetAccessGrants}
					onAddByEmail={handleAddByEmail}
				/>
			</div>

			{shouldShowActiveInvitesSection ? (
				<>
					<Separator />
					<div className="px-8">
						<WorkspaceActiveInvitesSection
							invites={workspaceInvites}
							isLoading={invitesResult.fetching}
							onCopyInviteLink={copyInviteLink}
							onRevokeInvite={handleRevokeInvite}
						/>
					</div>
				</>
			) : null}

			{canManageWorkspace ? (
				<>
					<Separator />
					<div className="px-8 pb-8">
						<WorkspaceInviteCreateSection
							inviteRole={inviteRole}
							expiresInDays={expiresInDays}
							generatedInviteLink={generatedInviteLink}
							restrictAccess={restrictAccess}
							selectedProviderIds={selectedProviderIds}
							providers={providers}
							onInviteRoleChange={setInviteRole}
							onExpiresInDaysChange={setExpiresInDays}
							onRestrictAccessChange={(v) => {
								setRestrictAccess(v);
								if (!v) setSelectedProviderIds([]);
							}}
							onProviderToggle={handleProviderToggle}
							onCreateInvite={handleCreateInvite}
							onCopyInviteLink={copyInviteLink}
						/>
					</div>
				</>
			) : null}
		</div>
	);
}
