import { Trans } from "@lingui/react/macro";
import { Fingerprint, Loader2, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
	useAddPasskey,
	useDeletePasskey,
	useMyPasskeys,
} from "@/features/auth/hooks/usePasskeys";

export function PasskeysSection() {
	const [{ data, fetching }, refetch] = useMyPasskeys();
	const [, addPasskey] = useAddPasskey();
	const [, deletePasskey] = useDeletePasskey();
	const [newName, setNewName] = useState("");
	const [isAdding, setIsAdding] = useState(false);
	const [deletingId, setDeletingId] = useState<string | null>(null);

	const passkeys = data?.myPasskeys ?? [];

	async function handleAdd() {
		const name = newName.trim() || "Passkey";
		setIsAdding(true);
		try {
			const result = await addPasskey(name);
			if (result.error) {
				toast.error(result.error.message.replace(/^\[GraphQL\]\s*/, ""));
			} else {
				toast.success("Passkey added");
				setNewName("");
				refetch({ requestPolicy: "network-only" });
			}
		} catch (err) {
			const message = err instanceof Error ? err.message : String(err);
			if (
				!message.toLowerCase().includes("cancel") &&
				!message.toLowerCase().includes("abort")
			) {
				toast.error(message);
			}
		} finally {
			setIsAdding(false);
		}
	}

	async function handleDelete(id: string) {
		setDeletingId(id);
		try {
			const result = await deletePasskey(id);
			if (result.error) {
				toast.error(result.error.message.replace(/^\[GraphQL\]\s*/, ""));
			} else {
				toast.success("Passkey removed");
				refetch({ requestPolicy: "network-only" });
			}
		} finally {
			setDeletingId(null);
		}
	}

	return (
		<div className="space-y-6">
			<div>
				<h3 className="text-lg font-medium">
					<Trans>Passkeys</Trans>
				</h3>
				<p className="text-sm text-muted-foreground">
					<Trans>
						Use biometrics or a security key to sign in without a password.
					</Trans>
				</p>
			</div>

			{fetching ? (
				<div className="flex items-center gap-2 text-sm text-muted-foreground">
					<Loader2 className="h-4 w-4 animate-spin" />
					<Trans>Loading passkeys…</Trans>
				</div>
			) : passkeys.length === 0 ? (
				<p className="text-sm text-muted-foreground">
					<Trans>No passkeys registered yet.</Trans>
				</p>
			) : (
				<ul className="space-y-2">
					{passkeys.map((pk) => (
						<li
							key={pk.id}
							className="flex items-center justify-between rounded-md border border-border px-4 py-3"
						>
							<div className="flex items-center gap-3">
								<Fingerprint className="h-4 w-4 text-muted-foreground shrink-0" />
								<div>
									<p className="text-sm font-medium">{pk.name}</p>
									<p className="text-xs text-muted-foreground">
										{new Date(pk.createdAt).toLocaleDateString()}
										{pk.backedUp && (
											<Badge variant="secondary" className="ml-2 text-xs py-0">
												<Trans>Synced</Trans>
											</Badge>
										)}
									</p>
								</div>
							</div>
							<Button
								variant="ghost"
								size="icon"
								disabled={deletingId === pk.id}
								onClick={() => handleDelete(pk.id)}
								className="text-muted-foreground hover:text-destructive"
							>
								{deletingId === pk.id ? (
									<Loader2 className="h-4 w-4 animate-spin" />
								) : (
									<Trash2 className="h-4 w-4" />
								)}
							</Button>
						</li>
					))}
				</ul>
			)}

			<div className="flex items-end gap-3 max-w-md">
				<div className="flex-1 space-y-2">
					<Label htmlFor="passkey-name">
						<Trans>Name (optional)</Trans>
					</Label>
					<Input
						id="passkey-name"
						value={newName}
						onChange={(e) => setNewName(e.target.value)}
						placeholder="MacBook, iPhone…"
					/>
				</div>
				<Button onClick={handleAdd} disabled={isAdding}>
					{isAdding ? (
						<Loader2 className="mr-2 h-4 w-4 animate-spin" />
					) : (
						<Plus className="mr-2 h-4 w-4" />
					)}
					<Trans>Add Passkey</Trans>
				</Button>
			</div>
		</div>
	);
}
