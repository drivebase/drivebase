import { Copy, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { WorkspaceMemberRole } from "@/gql/graphql";

interface WorkspaceInviteItem {
	id: string;
	token: string;
	role: WorkspaceMemberRole;
	expiresAt: string;
}

interface WorkspaceActiveInvitesSectionProps {
	invites: WorkspaceInviteItem[];
	isLoading: boolean;
	onCopyInviteLink: (link: string) => void;
	onRevokeInvite: (inviteId: string) => void;
}

export function WorkspaceActiveInvitesSection(
	props: WorkspaceActiveInvitesSectionProps,
) {
	const { invites, isLoading, onCopyInviteLink, onRevokeInvite } = props;

	return (
		<div className="space-y-3">
			<h4 className="font-medium">Active invite links</h4>
			<div className="border  divide-y">
				{invites.map((invite) => {
					const link = `${window.location.origin}/join-workspace?token=${invite.token}`;
					return (
						<div
							key={invite.id}
							className="p-3 flex items-center justify-between gap-3"
						>
							<div className="min-w-0">
								<div className="text-sm font-medium">{invite.role}</div>
								<div className="text-xs text-muted-foreground">
									Expires: {new Date(invite.expiresAt).toLocaleString()}
								</div>
							</div>
							<div className="flex items-center gap-2">
								<Button
									variant="outline"
									onClick={() => onCopyInviteLink(link)}
								>
									<Copy className="h-4 w-4 mr-2" />
									Copy
								</Button>
								<Button
									variant="ghost"
									size="icon"
									onClick={() => onRevokeInvite(invite.id)}
								>
									<Trash2 className="h-4 w-4" />
								</Button>
							</div>
						</div>
					);
				})}
				{isLoading ? (
					<div className="p-3 text-sm text-muted-foreground">
						Loading invites…
					</div>
				) : null}
			</div>
		</div>
	);
}
