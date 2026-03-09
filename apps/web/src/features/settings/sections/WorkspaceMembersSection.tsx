import { Trans } from "@lingui/react/macro";
import { useState } from "react";
import { PiShieldCheck, PiTrash as Trash2 } from "react-icons/pi";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import {
	Sheet,
	SheetContent,
	SheetDescription,
	SheetFooter,
	SheetHeader,
	SheetTitle,
} from "@/components/ui/sheet";
import { WorkspaceMemberRole } from "@/gql/graphql";

const ASSIGNABLE_ROLES = [
	WorkspaceMemberRole.Admin,
	WorkspaceMemberRole.Editor,
	WorkspaceMemberRole.Viewer,
] as const;

interface AccessGrant {
	providerId: string;
	folderId?: string | null;
}

interface Provider {
	id: string;
	name: string;
	type: string;
}

interface WorkspaceMemberItem {
	userId: string;
	name: string;
	email: string;
	role: WorkspaceMemberRole;
	isOwner: boolean;
	accessGrants: AccessGrant[];
}

interface WorkspaceMembersSectionProps {
	members: WorkspaceMemberItem[];
	isLoading: boolean;
	canManageWorkspace: boolean;
	providers: Provider[];
	onUpdateRole: (userId: string, role: WorkspaceMemberRole) => void;
	onRemoveMember: (userId: string) => void;
	onSetAccessGrants: (userId: string, grants: AccessGrant[]) => Promise<void>;
}

interface EditAccessSheetProps {
	member: WorkspaceMemberItem;
	providers: Provider[];
	open: boolean;
	onOpenChange: (open: boolean) => void;
	onSave: (userId: string, grants: AccessGrant[]) => Promise<void>;
}

function EditAccessSheet({
	member,
	providers,
	open,
	onOpenChange,
	onSave,
}: EditAccessSheetProps) {
	const currentProviderIds = member.accessGrants.map((g) => g.providerId);
	const [selectedIds, setSelectedIds] = useState<string[]>(currentProviderIds);
	const [saving, setSaving] = useState(false);

	const toggle = (id: string, checked: boolean) => {
		setSelectedIds((prev) =>
			checked ? [...prev, id] : prev.filter((x) => x !== id),
		);
	};

	const handleSave = async () => {
		setSaving(true);
		const grants: AccessGrant[] = selectedIds.map((id) => ({
			providerId: id,
			folderId: null,
		}));
		await onSave(member.userId, grants);
		setSaving(false);
		onOpenChange(false);
	};

	return (
		<Sheet open={open} onOpenChange={onOpenChange}>
			<SheetContent>
				<SheetHeader>
					<SheetTitle>
						<Trans>Edit access</Trans>
					</SheetTitle>
					<SheetDescription>
						<Trans>
							Choose which providers {member.name} can access. Leave all
							unchecked to grant full workspace access.
						</Trans>
					</SheetDescription>
				</SheetHeader>
				<div className="py-4">
					{providers.length === 0 ? (
						<p className="text-sm text-muted-foreground">
							<Trans>No providers connected to this workspace.</Trans>
						</p>
					) : (
						<div className="border divide-y">
							{providers.map((provider) => (
								<label
									key={provider.id}
									className="flex items-center gap-3 p-3 cursor-pointer hover:bg-accent/50"
								>
									<Checkbox
										checked={selectedIds.includes(provider.id)}
										onCheckedChange={(value) => toggle(provider.id, !!value)}
									/>
									<span className="text-sm font-medium flex-1">
										{provider.name}
									</span>
									<Badge variant="secondary" className="text-xs capitalize">
										{provider.type.replace("_", " ")}
									</Badge>
								</label>
							))}
						</div>
					)}
					{selectedIds.length === 0 && providers.length > 0 ? (
						<p className="text-xs text-muted-foreground mt-2">
							<Trans>No restrictions — full workspace access.</Trans>
						</p>
					) : null}
				</div>
				<SheetFooter>
					<Button variant="outline" onClick={() => onOpenChange(false)}>
						<Trans>Cancel</Trans>
					</Button>
					<Button onClick={handleSave} disabled={saving}>
						{saving ? <Trans>Saving…</Trans> : <Trans>Save</Trans>}
					</Button>
				</SheetFooter>
			</SheetContent>
		</Sheet>
	);
}

export function WorkspaceMembersSection(props: WorkspaceMembersSectionProps) {
	const {
		members,
		isLoading,
		canManageWorkspace,
		providers,
		onUpdateRole,
		onRemoveMember,
		onSetAccessGrants,
	} = props;

	const [editingMember, setEditingMember] =
		useState<WorkspaceMemberItem | null>(null);

	return (
		<>
			<div className="space-y-3">
				<h4 className="font-medium">
					<Trans>Members</Trans>
				</h4>
				<p className="text-sm text-muted-foreground">
					<Trans>Members in this workspace.</Trans>
				</p>
				<div className="border divide-y">
					{members.map((member) => (
						<div
							key={member.userId}
							className="p-3 flex items-center justify-between gap-3"
						>
							<div className="min-w-0">
								<div className="font-medium truncate">{member.name}</div>
								<div className="text-sm text-muted-foreground truncate">
									{member.email}
								</div>
								{!member.isOwner && member.accessGrants.length > 0 ? (
									<div className="text-xs text-muted-foreground mt-0.5">
										<Trans>
											Access: {member.accessGrants.length} provider
											{member.accessGrants.length !== 1 ? "s" : ""}
										</Trans>
									</div>
								) : null}
							</div>
							<div className="flex items-center gap-2">
								{member.isOwner ? <Badge>Owner</Badge> : null}
								{member.isOwner ? (
									<Badge variant="secondary">{member.role}</Badge>
								) : (
									<Select
										value={member.role}
										disabled={!canManageWorkspace}
										onValueChange={(value) =>
											onUpdateRole(member.userId, value as WorkspaceMemberRole)
										}
									>
										<SelectTrigger className="w-36">
											<SelectValue />
										</SelectTrigger>
										<SelectContent>
											{ASSIGNABLE_ROLES.map((role) => (
												<SelectItem key={role} value={role}>
													{role}
												</SelectItem>
											))}
										</SelectContent>
									</Select>
								)}
								{!member.isOwner && canManageWorkspace ? (
									<Button
										variant="ghost"
										size="icon"
										onClick={() => setEditingMember(member)}
										title="Edit provider access"
									>
										<PiShieldCheck className="h-4 w-4" />
									</Button>
								) : null}
								{member.isOwner ? null : (
									<Button
										variant="ghost"
										size="icon"
										disabled={!canManageWorkspace}
										onClick={() => onRemoveMember(member.userId)}
									>
										<Trash2 className="h-4 w-4" />
									</Button>
								)}
							</div>
						</div>
					))}
					{isLoading ? (
						<div className="p-3 text-sm text-muted-foreground">
							<Trans>Loading members…</Trans>
						</div>
					) : null}
				</div>
			</div>

			{editingMember ? (
				<EditAccessSheet
					member={editingMember}
					providers={providers}
					open={!!editingMember}
					onOpenChange={(open) => {
						if (!open) setEditingMember(null);
					}}
					onSave={onSetAccessGrants}
				/>
			) : null}
		</>
	);
}
