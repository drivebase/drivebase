import { Trans } from "@lingui/react/macro";
import { useRef, useState } from "react";
import { PiShieldCheck, PiUserPlus, PiTrash as Trash2 } from "react-icons/pi";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { Switch } from "@/components/ui/switch";
import { useSearchUsers } from "@/features/workspaces";
import { WorkspaceMemberRole } from "@/gql/graphql";

const ASSIGNABLE_ROLES = [
	WorkspaceMemberRole.Admin,
	WorkspaceMemberRole.Editor,
	WorkspaceMemberRole.Viewer,
] as const;

interface AccessGrant {
	providerId: string;
	folderPath?: string | null;
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
	onAddByEmail: (
		email: string,
		role: WorkspaceMemberRole,
		grants: AccessGrant[],
	) => Promise<void>;
}

// --- Add member dialog ---

interface AddMemberDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	providers: Provider[];
	onAdd: (
		email: string,
		role: WorkspaceMemberRole,
		grants: AccessGrant[],
	) => Promise<void>;
}

function AddMemberDialog({
	open,
	onOpenChange,
	providers,
	onAdd,
}: AddMemberDialogProps) {
	const [email, setEmail] = useState("");
	const [role, setRole] = useState<WorkspaceMemberRole>(
		WorkspaceMemberRole.Viewer,
	);
	const [restrictAccess, setRestrictAccess] = useState(false);
	// map of providerId → optional folder path
	const [providerPaths, setProviderPaths] = useState<Record<string, string>>(
		{},
	);
	const [loading, setLoading] = useState(false);
	const [showSuggestions, setShowSuggestions] = useState(false);
	const inputRef = useRef<HTMLInputElement>(null);

	const searchResult = useSearchUsers(email);
	const suggestions = searchResult.data?.searchUsers ?? [];

	const selectedProviderIds = Object.keys(providerPaths);

	const reset = () => {
		setEmail("");
		setRole(WorkspaceMemberRole.Viewer);
		setRestrictAccess(false);
		setProviderPaths({});
		setLoading(false);
		setShowSuggestions(false);
	};

	const handleOpenChange = (v: boolean) => {
		if (!v) reset();
		onOpenChange(v);
	};

	const handleSelect = (suggestion: { email: string }) => {
		setEmail(suggestion.email);
		setShowSuggestions(false);
		inputRef.current?.focus();
	};

	const toggleProvider = (id: string, checked: boolean) => {
		setProviderPaths((prev) => {
			if (!checked) {
				const next = { ...prev };
				delete next[id];
				return next;
			}
			return { ...prev, [id]: "" };
		});
	};

	const setPath = (providerId: string, path: string) => {
		setProviderPaths((prev) => ({ ...prev, [providerId]: path }));
	};

	const handleAdd = async () => {
		if (!email.trim()) return;
		setLoading(true);
		const grants: AccessGrant[] =
			restrictAccess && selectedProviderIds.length > 0
				? selectedProviderIds.map((id) => ({
						providerId: id,
						folderPath: providerPaths[id]?.trim() || null,
					}))
				: [];
		await onAdd(email.trim(), role, grants);
		reset();
		onOpenChange(false);
	};

	return (
		<Dialog open={open} onOpenChange={handleOpenChange}>
			<DialogContent className="sm:max-w-md">
				<DialogHeader>
					<DialogTitle>
						<Trans>Add member</Trans>
					</DialogTitle>
					<DialogDescription>
						<Trans>
							Add an existing user to this workspace by their email address.
						</Trans>
					</DialogDescription>
				</DialogHeader>

				<div className="space-y-4 py-2">
					{/* Email with suggestions */}
					<div className="space-y-2">
						<Label>
							<Trans>Email</Trans>
						</Label>
						<div className="relative">
							<Input
								ref={inputRef}
								type="email"
								placeholder="user@example.com"
								value={email}
								onChange={(e) => {
									setEmail(e.target.value);
									setShowSuggestions(true);
								}}
								onFocus={() => setShowSuggestions(true)}
								onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
								onKeyDown={(e) => {
									if (e.key === "Enter") handleAdd();
								}}
							/>
							{showSuggestions && suggestions.length > 0 ? (
								<div className="absolute z-50 top-full mt-1 left-0 right-0 bg-popover border shadow-md">
									{suggestions.map((s) => (
										<button
											key={s.id}
											type="button"
											className="w-full text-left px-3 py-2 hover:bg-accent flex flex-col"
											onMouseDown={() => handleSelect(s)}
										>
											<span className="text-sm font-medium">{s.name}</span>
											<span className="text-xs text-muted-foreground">
												{s.email}
											</span>
										</button>
									))}
								</div>
							) : null}
						</div>
					</div>

					{/* Role */}
					<div className="space-y-2">
						<Label>
							<Trans>Role</Trans>
						</Label>
						<Select
							value={role}
							onValueChange={(v) => setRole(v as WorkspaceMemberRole)}
						>
							<SelectTrigger>
								<SelectValue />
							</SelectTrigger>
							<SelectContent>
								{ASSIGNABLE_ROLES.map((r) => (
									<SelectItem key={r} value={r}>
										{r}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
					</div>

					{/* Provider access restriction */}
					{providers.length > 0 ? (
						<div className="space-y-3">
							<div className="flex items-center gap-3">
								<Switch
									id="add-restrict-access"
									checked={restrictAccess}
									onCheckedChange={(v) => {
										setRestrictAccess(v);
										if (!v) setProviderPaths({});
									}}
								/>
								<Label htmlFor="add-restrict-access" className="cursor-pointer">
									<Trans>Limit to specific providers</Trans>
								</Label>
							</div>
							{restrictAccess ? (
								<div className="border divide-y">
									{providers.map((provider) => {
										const checked = selectedProviderIds.includes(provider.id);
										return (
											<div key={provider.id} className="p-3 space-y-2">
												<label
													htmlFor={`member-provider-${provider.id}`}
													className="flex items-center gap-3 cursor-pointer"
												>
													<Checkbox
														id={`member-provider-${provider.id}`}
														checked={checked}
														onCheckedChange={(v) =>
															toggleProvider(provider.id, !!v)
														}
													/>
													<span className="text-sm font-medium flex-1">
														{provider.name}
													</span>
													<Badge
														variant="secondary"
														className="text-xs capitalize"
													>
														{provider.type.replace("_", " ")}
													</Badge>
												</label>
												{checked ? (
													<div className="pl-7">
														<Input
															className="h-7 text-xs"
															placeholder="/folder/path (optional)"
															value={providerPaths[provider.id] ?? ""}
															onChange={(e) =>
																setPath(provider.id, e.target.value)
															}
														/>
													</div>
												) : null}
											</div>
										);
									})}
								</div>
							) : null}
						</div>
					) : null}
				</div>

				<DialogFooter>
					<Button variant="outline" onClick={() => handleOpenChange(false)}>
						<Trans>Cancel</Trans>
					</Button>
					<Button onClick={handleAdd} disabled={loading || !email.trim()}>
						{loading ? <Trans>Adding…</Trans> : <Trans>Add member</Trans>}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}

// --- Edit access sheet ---

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
			folderPath: null,
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
									htmlFor={`access-provider-${provider.id}`}
									className="flex items-center gap-3 p-3 cursor-pointer hover:bg-accent/50"
								>
									<Checkbox
										id={`access-provider-${provider.id}`}
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

// --- Main section ---

export function WorkspaceMembersSection(props: WorkspaceMembersSectionProps) {
	const {
		members,
		isLoading,
		canManageWorkspace,
		providers,
		onUpdateRole,
		onRemoveMember,
		onSetAccessGrants,
		onAddByEmail,
	} = props;

	const [addDialogOpen, setAddDialogOpen] = useState(false);
	const [editingMember, setEditingMember] =
		useState<WorkspaceMemberItem | null>(null);

	return (
		<>
			<div className="space-y-3">
				<div className="flex items-center justify-between">
					<div>
						<h4 className="font-medium">
							<Trans>Members</Trans>
						</h4>
						<p className="text-sm text-muted-foreground">
							<Trans>Members in this workspace.</Trans>
						</p>
					</div>
					{canManageWorkspace ? (
						<Button size="sm" onClick={() => setAddDialogOpen(true)}>
							<PiUserPlus className="h-4 w-4 mr-2" />
							<Trans>Add member</Trans>
						</Button>
					) : null}
				</div>

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

			<AddMemberDialog
				open={addDialogOpen}
				onOpenChange={setAddDialogOpen}
				providers={providers}
				onAdd={onAddByEmail}
			/>

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
