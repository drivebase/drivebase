import { Trans } from "@lingui/react/macro";
import { Check, Copy, Plus, ShieldAlert, Trash2 } from "lucide-react";
import { confirmDialog } from "@/shared/lib/confirmDialog";
import { useCallback, useState } from "react";
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
import { Textarea } from "@/components/ui/textarea";
import {
	useApiKeys,
	useCreateApiKey,
	useRevokeApiKey,
} from "../hooks/useApiKeys";

const SCOPES = [
	{
		value: "read",
		label: "Read",
		description: "List and download files, list providers",
	},
	{
		value: "write",
		label: "Write",
		description: "Upload, delete, move, rename (includes read)",
	},
	{
		value: "admin",
		label: "Admin",
		description: "Full access including workspace settings (includes write)",
	},
] as const;

function formatDate(value: string | null | undefined): string {
	if (!value) return "Never";
	return new Date(value).toLocaleDateString();
}

export function ApiKeysSection() {
	const [{ data, fetching }, refetch] = useApiKeys();
	const [, createKey] = useCreateApiKey();
	const [, revokeKey] = useRevokeApiKey();

	// Create dialog
	const [createOpen, setCreateOpen] = useState(false);
	const [name, setName] = useState("");
	const [description, setDescription] = useState("");
	const [selectedScopes, setSelectedScopes] = useState<string[]>(["read"]);
	const [expiresAt, setExpiresAt] = useState("");
	const [isCreating, setIsCreating] = useState(false);

	// Reveal dialog (shown once after creation)
	const [revealKey, setRevealKey] = useState<string | null>(null);
	const [copied, setCopied] = useState(false);
	const [acknowledged, setAcknowledged] = useState(false);

	const toggleScope = useCallback((scope: string) => {
		setSelectedScopes((prev) =>
			prev.includes(scope) ? prev.filter((s) => s !== scope) : [...prev, scope],
		);
	}, []);

	const handleCreate = useCallback(async () => {
		if (!name.trim()) {
			toast.error("Name is required");
			return;
		}
		if (selectedScopes.length === 0) {
			toast.error("Select at least one scope");
			return;
		}
		setIsCreating(true);
		try {
			const result = await createKey({
				input: {
					name: name.trim(),
					description: description.trim() || null,
					scopes: selectedScopes,
					expiresAt: expiresAt ? new Date(expiresAt).toISOString() : null,
				},
			});
			if (result.error) throw result.error;
			const fullKey = result.data?.createApiKey.fullKey;
			if (fullKey) {
				setRevealKey(fullKey);
				setAcknowledged(false);
				setCopied(false);
			}
			setCreateOpen(false);
			setName("");
			setDescription("");
			setSelectedScopes(["read"]);
			setExpiresAt("");
			refetch({ requestPolicy: "network-only" });
		} catch {
			toast.error("Failed to create API key");
		} finally {
			setIsCreating(false);
		}
	}, [name, description, selectedScopes, expiresAt, createKey, refetch]);

	const handleRevoke = useCallback(
		async (id: string, keyName: string) => {
			const confirmed = await confirmDialog(
				"Revoke API key",
				`Revoke "${keyName}"? Any scripts using this key will immediately lose access. This cannot be undone.`,
			);
			if (!confirmed) return;
			const result = await revokeKey({ id });
			if (result.error) {
				toast.error("Failed to revoke API key");
				return;
			}
			toast.success("API key revoked");
			refetch({ requestPolicy: "network-only" });
		},
		[revokeKey, refetch],
	);

	const handleCopy = useCallback(() => {
		if (!revealKey) return;
		navigator.clipboard.writeText(revealKey).then(() => {
			setCopied(true);
			setTimeout(() => setCopied(false), 2000);
		});
	}, [revealKey]);

	const keys = data?.apiKeys ?? [];

	return (
		<div className="space-y-6">
			<div className="flex items-center justify-between">
				<div>
					<h3 className="text-lg font-medium">
						<Trans>API Keys</Trans>
					</h3>
					<p className="text-sm text-muted-foreground">
						<Trans>
							Programmatic access credentials for scripts and integrations.
						</Trans>
					</p>
				</div>
				<Button size="sm" className="gap-2" onClick={() => setCreateOpen(true)}>
					<Plus className="w-4 h-4" />
					<Trans>New Key</Trans>
				</Button>
			</div>

			{fetching && keys.length === 0 ? (
				<p className="text-sm text-muted-foreground">
					<Trans>Loading...</Trans>
				</p>
			) : keys.length === 0 ? (
				<p className="text-sm text-muted-foreground">
					<Trans>No API keys yet.</Trans>
				</p>
			) : (
				<div className="border divide-y">
					{keys.map((key) => (
						<div
							key={key.id}
							className="p-4 flex items-start justify-between gap-4"
						>
							<div className="min-w-0 space-y-1">
								<div className="flex items-center gap-2 flex-wrap">
									<span className="font-medium">{key.name}</span>
									{!key.isActive && (
										<Badge variant="destructive">
											<Trans>Revoked</Trans>
										</Badge>
									)}
								</div>
								{key.description && (
									<p className="text-sm text-muted-foreground">
										{key.description}
									</p>
								)}
								<div className="flex items-center gap-2 flex-wrap text-xs text-muted-foreground">
									<code className="font-mono bg-muted px-1.5 py-0.5 rounded">
										{key.keyPrefix}…
									</code>
									<span>·</span>
									{key.scopes.map((s) => (
										<Badge key={s} variant="secondary" className="text-xs">
											{s}
										</Badge>
									))}
									<span>·</span>
									<span>
										<Trans>Created</Trans> {formatDate(key.createdAt)}
									</span>
									{key.expiresAt && (
										<>
											<span>·</span>
											<span>
												<Trans>Expires</Trans> {formatDate(key.expiresAt)}
											</span>
										</>
									)}
									{key.lastUsedAt && (
										<>
											<span>·</span>
											<span>
												<Trans>Last used</Trans> {formatDate(key.lastUsedAt)}
											</span>
										</>
									)}
								</div>
							</div>
							{key.isActive && (
								<Button
									variant="ghost"
									size="icon"
									className="text-destructive hover:text-destructive shrink-0"
									onClick={() => handleRevoke(key.id, key.name)}
								>
									<Trash2 className="w-4 h-4" />
								</Button>
							)}
						</div>
					))}
				</div>
			)}

			<p className="text-sm text-muted-foreground">
				<Trans>Learn how to use API keys in the</Trans>{" "}
				<a
					href="https://docs.drivebase.io/api"
					target="_blank"
					rel="noopener noreferrer"
					className="underline underline-offset-4 hover:text-foreground"
				>
					<Trans>documentation</Trans>
				</a>
				.
			</p>

			{/* Create dialog */}
			<Dialog open={createOpen} onOpenChange={setCreateOpen}>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>
							<Trans>Create API Key</Trans>
						</DialogTitle>
					</DialogHeader>

					<div className="space-y-4">
						<div className="space-y-2">
							<Label htmlFor="key-name">
								<Trans>Name</Trans>
							</Label>
							<Input
								id="key-name"
								value={name}
								onChange={(e) => setName(e.target.value)}
								placeholder="My script"
								autoFocus
							/>
						</div>

						<div className="space-y-2">
							<Label htmlFor="key-description">
								<Trans>Description</Trans>{" "}
								<span className="text-muted-foreground text-xs">
									<Trans>(optional)</Trans>
								</span>
							</Label>
							<Textarea
								id="key-description"
								value={description}
								onChange={(e) => setDescription(e.target.value)}
								placeholder="What is this key used for?"
								rows={2}
							/>
						</div>

						<div className="space-y-2">
							<Label>
								<Trans>Scopes</Trans>
							</Label>
							<div className="space-y-2">
								{SCOPES.map((scope) => (
									<div key={scope.value} className="flex items-start gap-3">
										<Checkbox
											id={`scope-${scope.value}`}
											checked={selectedScopes.includes(scope.value)}
											onCheckedChange={() => toggleScope(scope.value)}
										/>
										<div className="grid gap-0.5 leading-none">
											<label
												htmlFor={`scope-${scope.value}`}
												className="text-sm font-medium cursor-pointer"
											>
												{scope.label}
											</label>
											<p className="text-xs text-muted-foreground">
												{scope.description}
											</p>
										</div>
									</div>
								))}
							</div>
						</div>

						<div className="space-y-2">
							<div className="flex items-center justify-between">
								<Label>
									<Trans>Expiry</Trans>
								</Label>
								<Button
									type="button"
									variant="ghost"
									size="sm"
									className="h-auto py-0.5 px-2 text-xs"
									onClick={() =>
										setExpiresAt(
											expiresAt
												? ""
												: new Date(Date.now() + 90 * 86400 * 1000)
														.toISOString()
														.slice(0, 10),
										)
									}
								>
									{expiresAt ? (
										<Trans>Remove expiry</Trans>
									) : (
										<Trans>Set expiry</Trans>
									)}
								</Button>
							</div>
							{expiresAt ? (
								<Input
									id="key-expires"
									type="date"
									value={expiresAt}
									onChange={(e) => setExpiresAt(e.target.value)}
								/>
							) : (
								<p className="text-sm text-muted-foreground">
									<Trans>Never expires</Trans>
								</p>
							)}
						</div>
					</div>

					<DialogFooter>
						<Button variant="outline" onClick={() => setCreateOpen(false)}>
							<Trans>Cancel</Trans>
						</Button>
						<Button onClick={handleCreate} disabled={isCreating}>
							{isCreating ? <Trans>Creating…</Trans> : <Trans>Create</Trans>}
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>

			{/* Key reveal dialog — shown exactly once */}
			<Dialog
				open={!!revealKey}
				onOpenChange={(open) => {
					if (!open && acknowledged) setRevealKey(null);
				}}
			>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>
							<Trans>Save your API key</Trans>
						</DialogTitle>
					</DialogHeader>

					<div className="space-y-4">
						<div className="flex items-start gap-2 p-3 bg-amber-50 border border-amber-200 rounded text-amber-800 text-sm">
							<ShieldAlert className="w-4 h-4 mt-0.5 shrink-0" />
							<Trans>
								This key will not be shown again. Copy it now and store it
								somewhere safe.
							</Trans>
						</div>

						<div className="space-y-2">
							<Label>
								<Trans>API Key</Trans>
							</Label>
							<div className="flex gap-2">
								<Input
									readOnly
									value={revealKey ?? ""}
									className="font-mono text-sm"
								/>
								<Button
									variant="outline"
									size="icon"
									onClick={handleCopy}
									className="shrink-0"
								>
									{copied ? (
										<Check className="w-4 h-4 text-green-600" />
									) : (
										<Copy className="w-4 h-4" />
									)}
								</Button>
							</div>
						</div>

						<div className="flex items-center gap-2">
							<Checkbox
								id="key-acknowledged"
								checked={acknowledged}
								onCheckedChange={(v) => setAcknowledged(!!v)}
							/>
							<label
								htmlFor="key-acknowledged"
								className="text-sm cursor-pointer"
							>
								<Trans>I've copied the key and stored it safely.</Trans>
							</label>
						</div>
					</div>

					<DialogFooter>
						<Button disabled={!acknowledged} onClick={() => setRevealKey(null)}>
							<Trans>Done</Trans>
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</div>
	);
}
