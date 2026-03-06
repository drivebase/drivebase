import { Trans } from "@lingui/react/macro";
import { useMemo, useState } from "react";
import {
	PiCheck as Check,
	PiCopy as Copy,
	PiFolder as Folder,
	PiHardDrives as HardDrives,
	PiLockKey as LockKey,
	PiPlus as Plus,
	PiTrash as Trash,
} from "react-icons/pi";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
	Dialog,
	DialogContent,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuthStore } from "@/features/auth/store/authStore";
import { useProviders } from "@/features/providers";
import {
	getActiveWorkspaceId,
	useWorkspaceMembers,
} from "@/features/workspaces";
import { WorkspaceMemberRole } from "@/gql/graphql";
import { confirmDialog } from "@/shared/lib/confirmDialog";
import {
	useCreateWebDavCredential,
	useRevokeWebDavCredential,
	useWebDavCredentials,
} from "../hooks/useWebDavCredentials";

function formatDate(value: string | null | undefined): string {
	if (!value) return "Never";
	return new Date(value).toLocaleDateString();
}

export function WebDavSection() {
	const activeWorkspaceId = getActiveWorkspaceId() ?? "";
	const currentUserId = useAuthStore((state) => state.user?.id ?? null);
	const [membersResult] = useWorkspaceMembers(
		activeWorkspaceId,
		!activeWorkspaceId,
	);
	const currentWorkspaceRole = useMemo(() => {
		if (!currentUserId) return null;
		const members = membersResult.data?.workspaceMembers ?? [];
		return (
			members.find((member) => member.userId === currentUserId)?.role ?? null
		);
	}, [currentUserId, membersResult.data?.workspaceMembers]);
	const canManage =
		currentWorkspaceRole === WorkspaceMemberRole.Owner ||
		currentWorkspaceRole === WorkspaceMemberRole.Admin;

	const [{ data, fetching }, refetch] = useWebDavCredentials(
		!activeWorkspaceId || !canManage,
	);
	const providersResult = useProviders();
	const [, createCredential] = useCreateWebDavCredential();
	const [, revokeCredential] = useRevokeWebDavCredential();

	const [createOpen, setCreateOpen] = useState(false);
	const [name, setName] = useState("");
	const [username, setUsername] = useState("");
	const [allProviders, setAllProviders] = useState(true);
	const [providerScopes, setProviderScopes] = useState<
		{ providerId: string; basePath: string }[]
	>([]);
	const [isCreating, setIsCreating] = useState(false);
	const [revealed, setRevealed] = useState<{
		username: string;
		password: string;
	} | null>(null);
	const [copied, setCopied] = useState(false);

	const providers = providersResult.data?.storageProviders ?? [];
	const credentials = data?.webDavCredentials ?? [];
	const sortedCredentials = useMemo(() => {
		return [...credentials].sort((a, b) => {
			if (a.isActive !== b.isActive) {
				return a.isActive ? -1 : 1;
			}

			return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
		});
	}, [credentials]);
	const endpoint =
		typeof window !== "undefined" ? `${window.location.origin}/dav` : "/dav";

	const handleCreate = async () => {
		if (
			!name.trim() ||
			!username.trim() ||
			(!allProviders && providerScopes.length === 0)
		) {
			toast.error("Fill out all required fields");
			return;
		}

		setIsCreating(true);
		try {
			const result = await createCredential({
				input: {
					name: name.trim(),
					username: username.trim(),
					providerScopes: allProviders ? null : providerScopes,
				},
			});

			if (result.error || !result.data?.createWebDavCredential) {
				throw result.error ?? new Error("Failed to create WebDAV credential");
			}

			setCreateOpen(false);
			setName("");
			setUsername("");
			setAllProviders(true);
			setProviderScopes([]);
			setRevealed({
				username: result.data.createWebDavCredential.credential.username,
				password: result.data.createWebDavCredential.password,
			});
			refetch({ requestPolicy: "network-only" });
		} catch (error) {
			toast.error(
				error instanceof Error
					? error.message
					: "Failed to create WebDAV credential",
			);
		} finally {
			setIsCreating(false);
		}
	};

	const handleRevoke = async (id: string, credentialName: string) => {
		const confirmed = await confirmDialog(
			"Revoke WebDAV credential",
			`Revoke "${credentialName}"? Any WebDAV client using it will immediately lose access.`,
		);
		if (!confirmed) return;

		const result = await revokeCredential({ id });
		if (result.error) {
			toast.error("Failed to revoke WebDAV credential");
			return;
		}
		toast.success("WebDAV credential revoked");
		refetch({ requestPolicy: "network-only" });
	};

	const handleCopy = async () => {
		if (!revealed) return;
		await navigator.clipboard.writeText(revealed.password);
		setCopied(true);
		setTimeout(() => setCopied(false), 2000);
	};

	if (!canManage) {
		return (
			<div className="space-y-2">
				<h3 className="text-lg font-medium">
					<Trans>WebDAV</Trans>
				</h3>
				<p className="text-sm text-muted-foreground">
					<Trans>Only workspace admins can manage WebDAV access.</Trans>
				</p>
			</div>
		);
	}

	return (
		<div className="space-y-6">
			<div className="flex items-center justify-between">
				<div>
					<h3 className="text-lg font-medium">
						<Trans>WebDAV</Trans>
					</h3>
					<p className="text-sm text-muted-foreground">
						<Trans>
							Expose workspace files through a read-only WebDAV endpoint.
						</Trans>
					</p>
				</div>
				<Button size="sm" className="gap-2" onClick={() => setCreateOpen(true)}>
					<Plus className="w-4 h-4" />
					<Trans>New Credential</Trans>
				</Button>
			</div>

			<div className="border p-4 space-y-2 bg-muted/20">
				<div className="text-sm font-medium">
					<Trans>Connection endpoint</Trans>
				</div>
				<code className="text-sm font-mono">{endpoint}</code>
				<p className="text-xs text-muted-foreground">
					<Trans>
						Clients should connect with Basic Auth using the generated username
						and password.
					</Trans>
				</p>
			</div>

			{fetching && sortedCredentials.length === 0 ? (
				<p className="text-sm text-muted-foreground">
					<Trans>Loading...</Trans>
				</p>
			) : sortedCredentials.length === 0 ? (
				<p className="text-sm text-muted-foreground">
					<Trans>No WebDAV credentials yet.</Trans>
				</p>
			) : (
				<div className="border divide-y">
					{sortedCredentials.map((credential) => (
						<div
							key={credential.id}
							className="p-4 flex items-start justify-between gap-4"
						>
							<div className="min-w-0 space-y-1">
								<div className="flex items-center gap-2 flex-wrap">
									<span className="font-medium">{credential.name}</span>
									<Badge variant="secondary">{credential.username}</Badge>
									{!credential.isActive && (
										<Badge variant="destructive">
											<Trans>Revoked</Trans>
										</Badge>
									)}
								</div>
								<div className="flex items-center gap-2 flex-wrap text-xs text-muted-foreground">
									<Badge variant="outline" className="text-xs">
										{credential.providerScopes
											? `${credential.providerScopes.length} provider(s)`
											: "All providers"}
									</Badge>
									<span>·</span>
									<span>
										<Trans>Created</Trans> {formatDate(credential.createdAt)}
									</span>
									<span>·</span>
									<span>
										<Trans>Last used</Trans> {formatDate(credential.lastUsedAt)}
									</span>
								</div>
								<div className="space-y-1 pt-1">
									{credential.providerScopes?.map((scope) => {
										const provider = providers.find(
											(entry) => entry.id === scope.providerId,
										);
										return (
											<div
												key={`${credential.id}-${scope.providerId}`}
												className="text-xs text-muted-foreground flex items-center gap-2"
											>
												<HardDrives className="w-3.5 h-3.5" />
												<span>{provider?.name ?? scope.providerId}</span>
												<span>·</span>
												<Folder className="w-3.5 h-3.5" />
												<span>{scope.basePath}</span>
											</div>
										);
									}) ?? (
										<div className="text-xs text-muted-foreground">
											<Trans>
												Serves the merged workspace root across all accessible
												providers.
											</Trans>
										</div>
									)}
								</div>
							</div>
							{credential.isActive && (
								<Button
									variant="ghost"
									size="icon"
									className="text-destructive hover:text-destructive shrink-0"
									onClick={() => handleRevoke(credential.id, credential.name)}
								>
									<Trash className="w-4 h-4" />
								</Button>
							)}
						</div>
					))}
				</div>
			)}

			<Dialog open={createOpen} onOpenChange={setCreateOpen}>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>
							<Trans>Create WebDAV Credential</Trans>
						</DialogTitle>
					</DialogHeader>
					<div className="space-y-4">
						<div className="space-y-2">
							<Label htmlFor="webdav-name">
								<Trans>Name</Trans>
							</Label>
							<Input
								id="webdav-name"
								value={name}
								onChange={(e) => setName(e.target.value)}
								placeholder="Mac Finder access"
								autoFocus
							/>
						</div>
						<div className="space-y-2">
							<Label htmlFor="webdav-username">
								<Trans>Username</Trans>
							</Label>
							<Input
								id="webdav-username"
								value={username}
								onChange={(e) => setUsername(e.target.value)}
								placeholder="alice.webdav"
							/>
						</div>
						<div className="space-y-3">
							<div>
								<Label>
									<Trans>Provider access</Trans>
								</Label>
								<p className="text-xs text-muted-foreground mt-1">
									<Trans>
										Leave provider restrictions off to serve the merged
										Drivebase root. Enable restrictions only when this
										credential should see specific providers or base paths.
									</Trans>
								</p>
							</div>
							<div className="border p-3 space-y-2">
								<label
									htmlFor="webdav-all-providers"
									className="flex items-center gap-2 text-sm font-medium"
								>
									<Checkbox
										id="webdav-all-providers"
										checked={allProviders}
										onCheckedChange={(checked) => {
											const nextValue = checked === true;
											setAllProviders(nextValue);
											if (nextValue) {
												setProviderScopes([]);
											}
										}}
									/>
									<span>
										<Trans>Allow all providers</Trans>
									</span>
								</label>
								<p className="text-xs text-muted-foreground">
									<Trans>
										When enabled, WebDAV root matches the merged Drivebase file
										view across the whole workspace.
									</Trans>
								</p>
							</div>
							<div className="space-y-3 max-h-72 overflow-y-auto pr-1">
								{allProviders
									? null
									: providers.map((provider) => {
											const entry = providerScopes.find(
												(scope) => scope.providerId === provider.id,
											);
											return (
												<div key={provider.id} className="border p-3 space-y-2">
													<div className="flex items-center justify-between gap-3">
														<label
															htmlFor={`webdav-provider-${provider.id}`}
															className="flex items-center gap-2 text-sm font-medium"
														>
															<Checkbox
																id={`webdav-provider-${provider.id}`}
																checked={Boolean(entry)}
																onCheckedChange={(checked) => {
																	if (checked) {
																		setProviderScopes((current) => [
																			...current,
																			{
																				providerId: provider.id,
																				basePath: "/",
																			},
																		]);
																		return;
																	}
																	setProviderScopes((current) =>
																		current.filter(
																			(scope) =>
																				scope.providerId !== provider.id,
																		),
																	);
																}}
															/>
															<span>{provider.name}</span>
														</label>
														<Badge variant="secondary">{provider.type}</Badge>
													</div>
													{entry ? (
														<div className="space-y-2">
															<Label
																htmlFor={`webdav-base-path-${provider.id}`}
															>
																<Trans>Base path</Trans>
															</Label>
															<Input
																id={`webdav-base-path-${provider.id}`}
																value={entry.basePath}
																onChange={(e) =>
																	setProviderScopes((current) =>
																		current.map((scope) =>
																			scope.providerId === provider.id
																				? {
																						...scope,
																						basePath: e.target.value || "/",
																					}
																				: scope,
																		),
																	)
																}
																placeholder="/"
															/>
														</div>
													) : null}
												</div>
											);
										})}
							</div>
						</div>
					</div>
					<DialogFooter>
						<Button
							variant="outline"
							onClick={() => setCreateOpen(false)}
							disabled={isCreating}
						>
							<Trans>Cancel</Trans>
						</Button>
						<Button onClick={handleCreate} disabled={isCreating}>
							<Trans>Create</Trans>
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>

			<Dialog
				open={Boolean(revealed)}
				onOpenChange={(open) => !open && setRevealed(null)}
			>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>
							<Trans>WebDAV Password</Trans>
						</DialogTitle>
					</DialogHeader>
					<div className="space-y-3">
						<p className="text-sm text-muted-foreground">
							<Trans>
								This password is shown only once. Store it in your WebDAV client
								before closing.
							</Trans>
						</p>
						<div className="border rounded-md p-3 space-y-2 bg-muted/20">
							<div className="text-xs uppercase tracking-wide text-muted-foreground">
								<Trans>Username</Trans>
							</div>
							<div className="font-mono text-sm">{revealed?.username}</div>
						</div>
						<div className="border rounded-md p-3 space-y-2 bg-muted/20">
							<div className="text-xs uppercase tracking-wide text-muted-foreground">
								<Trans>Password</Trans>
							</div>
							<div className="font-mono text-sm break-all">
								{revealed?.password}
							</div>
						</div>
						<Button variant="outline" className="gap-2" onClick={handleCopy}>
							{copied ? (
								<Check className="w-4 h-4" />
							) : (
								<Copy className="w-4 h-4" />
							)}
							<Trans>Copy password</Trans>
						</Button>
						<div className="border rounded-md p-3 text-sm flex items-start gap-2">
							<LockKey className="w-4 h-4 mt-0.5 text-muted-foreground" />
							<div>
								<div className="font-medium">
									<Trans>Endpoint</Trans>
								</div>
								<div className="font-mono text-xs text-muted-foreground">
									{endpoint}
								</div>
							</div>
						</div>
					</div>
				</DialogContent>
			</Dialog>
		</div>
	);
}
