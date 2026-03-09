import { Trans } from "@lingui/react/macro";
import { PiCopy as Copy, PiLink as Link2 } from "react-icons/pi";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { WorkspaceMemberRole } from "@/gql/graphql";

const ASSIGNABLE_ROLES = [
	WorkspaceMemberRole.Admin,
	WorkspaceMemberRole.Editor,
	WorkspaceMemberRole.Viewer,
] as const;

interface Provider {
	id: string;
	name: string;
	type: string;
}

interface WorkspaceInviteCreateSectionProps {
	inviteRole: WorkspaceMemberRole;
	expiresInDays: number;
	generatedInviteLink: string;
	restrictAccess: boolean;
	selectedProviderIds: string[];
	providers: Provider[];
	onInviteRoleChange: (role: WorkspaceMemberRole) => void;
	onExpiresInDaysChange: (value: number) => void;
	onRestrictAccessChange: (value: boolean) => void;
	onProviderToggle: (providerId: string, checked: boolean) => void;
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
		restrictAccess,
		selectedProviderIds,
		providers,
		onInviteRoleChange,
		onExpiresInDaysChange,
		onRestrictAccessChange,
		onProviderToggle,
		onCreateInvite,
		onCopyInviteLink,
	} = props;

	return (
		<div className="space-y-4">
			<div className="space-y-1">
				<h4 className="font-medium">
					<Trans>Create invite link</Trans>
				</h4>
				<p className="text-sm text-muted-foreground">
					<Trans>
						Share this link so others can join the workspace with a preset role.
					</Trans>
				</p>
			</div>
			<div className="flex flex-wrap gap-3">
				<div className="space-y-2 min-w-44">
					<Label>
						<Trans>Role</Trans>
					</Label>
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
				<div className="space-y-2">
					<Label>
						<Trans>Expires in</Trans>
					</Label>
					<Tabs
						value={expiresInDays.toString()}
						onValueChange={(value) => onExpiresInDaysChange(Number(value))}
					>
						<TabsList>
							<TabsTrigger value="1">
								<Trans>1 Day</Trans>
							</TabsTrigger>
							<TabsTrigger value="7">
								<Trans>7 Days</Trans>
							</TabsTrigger>
							<TabsTrigger value="14">
								<Trans>14 Days</Trans>
							</TabsTrigger>
						</TabsList>
					</Tabs>
				</div>
			</div>

			{providers.length > 0 ? (
				<div className="space-y-3">
					<div className="flex items-center gap-3">
						<Switch
							id="restrict-access"
							checked={restrictAccess}
							onCheckedChange={onRestrictAccessChange}
						/>
						<Label htmlFor="restrict-access" className="cursor-pointer">
							<Trans>Limit to specific providers</Trans>
						</Label>
					</div>
					{restrictAccess ? (
						<div className="border divide-y">
							{providers.map((provider) => {
								const checked = selectedProviderIds.includes(provider.id);
								return (
									<label
										key={provider.id}
										className="flex items-center gap-3 p-3 cursor-pointer hover:bg-accent/50"
									>
										<Checkbox
											checked={checked}
											onCheckedChange={(value) =>
												onProviderToggle(provider.id, !!value)
											}
										/>
										<span className="text-sm font-medium flex-1">
											{provider.name}
										</span>
										<Badge variant="secondary" className="text-xs capitalize">
											{provider.type.replace("_", " ")}
										</Badge>
									</label>
								);
							})}
						</div>
					) : null}
				</div>
			) : null}

			<Button onClick={onCreateInvite}>
				<Link2 className="h-4 w-4 mr-2" />
				<Trans>Generate invite link</Trans>
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
