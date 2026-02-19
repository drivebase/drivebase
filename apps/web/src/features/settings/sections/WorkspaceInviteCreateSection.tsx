import { Copy, Link2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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

interface WorkspaceInviteCreateSectionProps {
	inviteRole: WorkspaceMemberRole;
	expiresInDays: string;
	generatedInviteLink: string;
	onInviteRoleChange: (role: WorkspaceMemberRole) => void;
	onExpiresInDaysChange: (value: string) => void;
	onCreateInvite: () => void;
	onCopyInviteLink: (link: string) => void;
}

export function WorkspaceInviteCreateSection(
	props: WorkspaceInviteCreateSectionProps,
) {
	const {
		inviteRole,
		expiresInDays,
		generatedInviteLink,
		onInviteRoleChange,
		onExpiresInDaysChange,
		onCreateInvite,
		onCopyInviteLink,
	} = props;

	return (
		<div className="space-y-4">
			<div className="space-y-1">
				<h4 className="font-medium">Create invite link</h4>
				<p className="text-sm text-muted-foreground">
					Share this link so others can join the workspace with a preset role.
				</p>
			</div>
			<div className="flex flex-wrap gap-3">
				<div className="space-y-2 min-w-44">
					<Label>Role</Label>
					<Select
						value={inviteRole}
						onValueChange={(value) =>
							onInviteRoleChange(value as WorkspaceMemberRole)
						}
					>
						<SelectTrigger>
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
				</div>
				<div className="space-y-2 min-w-44">
					<Label>Expires in days</Label>
					<Input
						value={expiresInDays}
						onChange={(event) => onExpiresInDaysChange(event.target.value)}
						type="number"
						min={1}
						max={30}
					/>
				</div>
			</div>
			<Button onClick={onCreateInvite}>
				<Link2 className="h-4 w-4 mr-2" />
				Generate invite link
			</Button>
			{generatedInviteLink ? (
				<div className="flex gap-2 items-center max-w-md">
					<Input value={generatedInviteLink} readOnly />
					<Button
						variant="outline"
						onClick={() => onCopyInviteLink(generatedInviteLink)}
					>
						<Copy className="h-4 w-4" />
					</Button>
				</div>
			) : null}
		</div>
	);
}
