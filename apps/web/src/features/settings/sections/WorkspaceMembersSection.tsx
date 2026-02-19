import { Trans } from "@lingui/react/macro";
import { Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { WorkspaceMemberRole } from "@/gql/graphql";

const ASSIGNABLE_ROLES = [
	WorkspaceMemberRole.Admin,
	WorkspaceMemberRole.Editor,
	WorkspaceMemberRole.Viewer,
] as const;

interface WorkspaceMemberItem {
	userId: string;
	name: string;
	email: string;
	role: WorkspaceMemberRole;
	isOwner: boolean;
}

interface WorkspaceMembersSectionProps {
	members: WorkspaceMemberItem[];
	isLoading: boolean;
	canManageWorkspace: boolean;
	onUpdateRole: (userId: string, role: WorkspaceMemberRole) => void;
	onRemoveMember: (userId: string) => void;
}

export function WorkspaceMembersSection(props: WorkspaceMembersSectionProps) {
	const {
		members,
		isLoading,
		canManageWorkspace,
		onUpdateRole,
		onRemoveMember,
	} = props;

	return (
		<div className="space-y-3">
			<h4 className="font-medium">
				<Trans>Members</Trans>
			</h4>
			<p className="text-sm text-muted-foreground">
				<Trans>Members in this workspace.</Trans>
			</p>
			<div className="border rounded-md divide-y">
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
						Loading members…
					</div>
				) : null}
			</div>
		</div>
	);
}
