import { Trans } from "@lingui/react/macro";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Separator } from "@/components/ui/separator";
import { useAuthStore } from "@/features/auth/store/authStore";
import { WorkspaceActiveInvitesSection } from "@/features/settings/sections/WorkspaceActiveInvitesSection";
import { WorkspaceInviteCreateSection } from "@/features/settings/sections/WorkspaceInviteCreateSection";
import { WorkspaceMembersSection } from "@/features/settings/sections/WorkspaceMembersSection";
import {
	getActiveWorkspaceId,
	useCreateWorkspaceInvite,
	useRemoveWorkspaceMember,
	useRevokeWorkspaceInvite,
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
	const [, createInvite] = useCreateWorkspaceInvite();
	const [, updateRole] = useUpdateWorkspaceMemberRole();
	const [, removeMember] = useRemoveWorkspaceMember();
	const [, revokeInvite] = useRevokeWorkspaceInvite();

	const [inviteRole, setInviteRole] = useState<WorkspaceMemberRole>(
		WorkspaceMemberRole.Viewer,
	);
	const [expiresInDays, setExpiresInDays] = useState(7);
	const [generatedInviteLink, setGeneratedInviteLink] = useState("");

	const handleCreateInvite = async () => {
		if (!workspaceId || !canManageWorkspace) {
			return;
		}

		const result = await createInvite({
			input: {
				workspaceId,
				role: inviteRole,
				expiresInDays,
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
			{canManageWorkspace ? (
				<>
					<WorkspaceInviteCreateSection
						inviteRole={inviteRole}
						expiresInDays={expiresInDays}
						generatedInviteLink={generatedInviteLink}
						onInviteRoleChange={setInviteRole}
						onExpiresInDaysChange={setExpiresInDays}
						onCreateInvite={handleCreateInvite}
						onCopyInviteLink={copyInviteLink}
					/>
					<Separator />
				</>
			) : null}

			{shouldShowActiveInvitesSection ? (
				<>
					<WorkspaceActiveInvitesSection
						invites={workspaceInvites}
						isLoading={invitesResult.fetching}
						onCopyInviteLink={copyInviteLink}
						onRevokeInvite={handleRevokeInvite}
					/>
					<Separator />
				</>
			) : null}

			<WorkspaceMembersSection
				members={membersResult.data?.workspaceMembers ?? []}
				isLoading={membersResult.fetching}
				canManageWorkspace={canManageWorkspace}
				onUpdateRole={handleUpdateRole}
				onRemoveMember={handleRemoveMember}
			/>
		</div>
	);
}
