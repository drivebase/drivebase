import { Loader2, Share2, Trash2, Users } from "lucide-react";
import { useState } from "react";
import { useQuery } from "urql";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
	useFolderPermissions,
	useGrantFolderAccess,
	useRevokeFolderAccess,
} from "@/features/sharing/hooks/useSharing";
import { USERS_QUERY } from "@/shared/api/user";
import { PermissionRole } from "@/gql/graphql";

interface ShareDialogProps {
	isOpen: boolean;
	onClose: () => void;
	folderId: string;
	folderName: string;
}

const roleLabels: Record<PermissionRole, string> = {
	VIEWER: "Can view",
	EDITOR: "Can edit",
	ADMIN: "Can manage",
	OWNER: "Owner",
};

const roleDescriptions: Record<PermissionRole, string> = {
	VIEWER: "Can view files and folders",
	EDITOR: "Can view and edit files and folders",
	ADMIN: "Can manage permissions and settings",
	OWNER: "Full control (cannot be changed)",
};

export function ShareDialog({
	isOpen,
	onClose,
	folderId,
	folderName,
}: ShareDialogProps) {
	const [selectedUserId, setSelectedUserId] = useState<string>("");
	const [selectedRole, setSelectedRole] = useState<PermissionRole>(
		PermissionRole.Viewer,
	);

	const [permissionsResult, refetchPermissions] = useFolderPermissions(folderId);
	const [usersResult] = useQuery({ query: USERS_QUERY, variables: { limit: 100 } });
	const [{ fetching: granting }, grantAccess] = useGrantFolderAccess();
	const [{ fetching: revoking }, revokeAccess] = useRevokeFolderAccess();

	const folder = permissionsResult.data?.folder;
	const permissions = folder?.permissions ?? [];
	const users = usersResult.data?.users ?? [];

	// Filter out users who already have access
	const availableUsers = users.filter(
		(user) => !permissions.some((p) => p.userId === user.id),
	);

	const handleGrantAccess = async () => {
		if (!selectedUserId || !selectedRole) return;

		const result = await grantAccess({
			input: {
				folderId,
				userId: selectedUserId,
				role: selectedRole,
			},
		});

		if (!result.error) {
			setSelectedUserId("");
			setSelectedRole(PermissionRole.Viewer);
			refetchPermissions({ requestPolicy: "network-only" });
		}
	};

	const handleRevokeAccess = async (userId: string) => {
		const result = await revokeAccess({
			folderId,
			userId,
		});

		if (!result.error) {
			refetchPermissions({ requestPolicy: "network-only" });
		}
	};

	return (
		<Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
			<DialogContent className="sm:max-w-[550px]">
				<DialogHeader>
					<DialogTitle className="flex items-center gap-2">
						<Share2 className="h-5 w-5" />
						Share "{folderName}"
					</DialogTitle>
					<DialogDescription>
						Manage who can access this folder and its contents.
					</DialogDescription>
				</DialogHeader>

				<div className="space-y-4 py-4">
					{/* Add people section */}
					<div className="space-y-3">
						<div className="flex items-center gap-2">
							<Users className="h-4 w-4 text-muted-foreground" />
							<h4 className="text-sm font-medium">Add people</h4>
						</div>
						<div className="flex gap-2">
							<Select value={selectedUserId} onValueChange={setSelectedUserId}>
								<SelectTrigger className="flex-1">
									<SelectValue placeholder="Select a user..." />
								</SelectTrigger>
								<SelectContent>
									{availableUsers.map((user) => (
										<SelectItem key={user.id} value={user.id}>
											<div className="flex items-center gap-2">
												<Avatar className="h-6 w-6">
													<div className="flex h-full w-full items-center justify-center bg-primary/10 text-xs">
														{user.name?.[0]?.toUpperCase() ??
															user.email[0].toUpperCase()}
													</div>
												</Avatar>
												<div className="flex flex-col">
													<span className="text-sm">{user.name ?? user.email}</span>
													{user.name && (
														<span className="text-xs text-muted-foreground">
															{user.email}
														</span>
													)}
												</div>
											</div>
										</SelectItem>
									))}
								</SelectContent>
							</Select>
							<Select
								value={selectedRole}
								onValueChange={(value) =>
									setSelectedRole(value as PermissionRole)
								}
							>
								<SelectTrigger className="w-[140px]">
									<SelectValue />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value={PermissionRole.Viewer}>
										{roleLabels[PermissionRole.Viewer]}
									</SelectItem>
									<SelectItem value={PermissionRole.Editor}>
										{roleLabels[PermissionRole.Editor]}
									</SelectItem>
									<SelectItem value={PermissionRole.Admin}>
										{roleLabels[PermissionRole.Admin]}
									</SelectItem>
								</SelectContent>
							</Select>
							<Button
								onClick={handleGrantAccess}
								disabled={!selectedUserId || granting}
								size="sm"
							>
								{granting ? (
									<Loader2 className="h-4 w-4 animate-spin" />
								) : (
									"Add"
								)}
							</Button>
						</div>
						{selectedRole && (
							<p className="text-xs text-muted-foreground">
								{roleDescriptions[selectedRole]}
							</p>
						)}
					</div>

					{/* Current access list */}
					<div className="space-y-3">
						<h4 className="text-sm font-medium">People with access</h4>
						<ScrollArea className="h-[200px] pr-4">
							<div className="space-y-2">
								{permissionsResult.fetching ? (
									<div className="flex items-center justify-center py-8">
										<Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
									</div>
								) : permissions.length === 0 ? (
									<div className="flex flex-col items-center justify-center py-8 text-center">
										<Users className="h-8 w-8 text-muted-foreground mb-2" />
										<p className="text-sm text-muted-foreground">
											No one has access yet
										</p>
									</div>
								) : (
									permissions.map((permission) => (
										<div
											key={permission.id}
											className="flex items-center justify-between rounded-lg border p-3"
										>
											<div className="flex items-center gap-3">
												<Avatar className="h-8 w-8">
													<div className="flex h-full w-full items-center justify-center bg-primary/10 text-sm">
														{permission.user.name?.[0]?.toUpperCase() ??
															permission.user.email[0].toUpperCase()}
													</div>
												</Avatar>
												<div className="flex flex-col">
													<span className="text-sm font-medium">
														{permission.user.name ?? permission.user.email}
													</span>
													{permission.user.name && (
														<span className="text-xs text-muted-foreground">
															{permission.user.email}
														</span>
													)}
												</div>
											</div>
											<div className="flex items-center gap-2">
												<Badge variant="secondary">
													{roleLabels[permission.role]}
												</Badge>
												{permission.role !== PermissionRole.Owner && (
													<Button
														variant="ghost"
														size="sm"
														onClick={() => handleRevokeAccess(permission.userId)}
														disabled={revoking}
													>
														<Trash2 className="h-4 w-4" />
													</Button>
												)}
											</div>
										</div>
									))
								)}
							</div>
						</ScrollArea>
					</div>
				</div>

				<DialogFooter>
					<Button variant="outline" onClick={onClose}>
						Done
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
