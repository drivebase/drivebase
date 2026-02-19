import { Trans } from "@lingui/react/macro";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { useQuery } from "urql";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
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
import { Switch } from "@/components/ui/switch";
import { PROVIDERS_QUERY } from "@/features/providers/api/provider";
import type { GetFileRulesQuery } from "@/gql/graphql";
import { RULE_FOLDERS_QUERY } from "../api/rule";
import { useCreateFileRule, useUpdateFileRule } from "../hooks/useRules";
import {
	ConditionGroupEditor,
	type RuleConditionGroups,
} from "./ConditionGroupEditor";

type FileRule = GetFileRulesQuery["fileRules"][number];

interface RuleFormDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	rule?: FileRule | null;
	onSuccess: () => void;
}

const DEFAULT_CONDITIONS: RuleConditionGroups = {
	groups: [
		{
			conditions: [{ field: "extension", operator: "equals", value: "" }],
		},
	],
};

export function RuleFormDialog({
	open,
	onOpenChange,
	rule,
	onSuccess,
}: RuleFormDialogProps) {
	const isEditing = Boolean(rule);

	const [name, setName] = useState("");
	const [enabled, setEnabled] = useState(true);
	const [destinationProviderId, setDestinationProviderId] = useState("");
	const [destinationFolderId, setDestinationFolderId] = useState<string | null>(
		null,
	);
	const [conditions, setConditions] =
		useState<RuleConditionGroups>(DEFAULT_CONDITIONS);

	const [providersResult] = useQuery({ query: PROVIDERS_QUERY });
	const [foldersResult] = useQuery({
		query: RULE_FOLDERS_QUERY,
		pause: !destinationProviderId,
	});

	const [, createRule] = useCreateFileRule();
	const [, updateRule] = useUpdateFileRule();

	// biome-ignore lint/correctness/useExhaustiveDependencies: open resets the form when dialog opens
	useEffect(() => {
		if (rule) {
			setName(rule.name);
			setEnabled(rule.enabled);
			setDestinationProviderId(rule.destinationProviderId);
			setDestinationFolderId(rule.destinationFolderId ?? null);
			setConditions(rule.conditions as RuleConditionGroups);
		} else {
			setName("");
			setEnabled(true);
			setDestinationProviderId("");
			setDestinationFolderId(null);
			setConditions(DEFAULT_CONDITIONS);
		}
	}, [rule, open]);

	const providers =
		providersResult.data?.storageProviders?.filter((p) => p.isActive) ?? [];
	const folders = foldersResult.data?.folders ?? [];

	const handleSubmit = useCallback(async () => {
		if (!name.trim()) {
			toast.error("Rule name is required");
			return;
		}
		if (!destinationProviderId) {
			toast.error("Destination provider is required");
			return;
		}

		const hasEmptyValue = conditions.groups.some((g) =>
			g.conditions.some(
				(c) =>
					c.value === "" || (typeof c.value === "number" && c.field !== "size"),
			),
		);
		if (hasEmptyValue) {
			toast.error("All condition values must be filled");
			return;
		}

		if (isEditing && rule) {
			const result = await updateRule({
				id: rule.id,
				input: {
					name,
					enabled,
					conditions,
					destinationProviderId,
					destinationFolderId,
				},
			});
			if (result.error) {
				toast.error(result.error.message);
				return;
			}
			toast.success("Rule updated");
		} else {
			const result = await createRule({
				input: {
					name,
					enabled,
					conditions,
					destinationProviderId,
					destinationFolderId,
				},
			});
			if (result.error) {
				toast.error(result.error.message);
				return;
			}
			toast.success("Rule created");
		}

		onSuccess();
		onOpenChange(false);
	}, [
		name,
		enabled,
		conditions,
		destinationProviderId,
		destinationFolderId,
		isEditing,
		rule,
		createRule,
		updateRule,
		onSuccess,
		onOpenChange,
	]);

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
				<DialogHeader>
					<DialogTitle>
						{isEditing ? <Trans>Edit Rule</Trans> : <Trans>Create Rule</Trans>}
					</DialogTitle>
				</DialogHeader>

				<div className="space-y-4 py-2">
					<div className="space-y-2">
						<Label>
							<Trans>Name</Trans>
						</Label>
						<Input
							value={name}
							onChange={(e) => setName(e.target.value)}
							placeholder="e.g. PDFs to S3"
						/>
					</div>

					<div className="flex items-center gap-2">
						<Switch checked={enabled} onCheckedChange={setEnabled} />
						<Label>
							<Trans>Enabled</Trans>
						</Label>
					</div>

					<div className="space-y-2">
						<Label>
							<Trans>Destination Provider</Trans>
						</Label>
						<Select
							value={destinationProviderId}
							onValueChange={(v) => {
								setDestinationProviderId(v);
								setDestinationFolderId(null);
							}}
						>
							<SelectTrigger>
								<SelectValue placeholder="Select a provider" />
							</SelectTrigger>
							<SelectContent>
								{providers.map((p) => (
									<SelectItem key={p.id} value={p.id}>
										{p.name}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
					</div>

					<div className="space-y-2">
						<Label>
							<Trans>Destination Folder (optional)</Trans>
						</Label>
						<Select
							value={destinationFolderId ?? "__none__"}
							onValueChange={(v) =>
								setDestinationFolderId(v === "__none__" ? null : v)
							}
						>
							<SelectTrigger>
								<SelectValue placeholder="Root (no folder)" />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value="__none__">
									<Trans>Root (no folder)</Trans>
								</SelectItem>
								{folders.map((f) => (
									<SelectItem key={f.id} value={f.id}>
										{f.virtualPath}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
					</div>

					<div className="space-y-2">
						<Label>
							<Trans>Conditions</Trans>
						</Label>
						<p className="text-xs text-muted-foreground">
							<Trans>
								Files matching these conditions will be routed to the
								destination. Groups are combined with OR; conditions within a
								group are combined with AND.
							</Trans>
						</p>
						<ConditionGroupEditor
							conditionGroups={conditions}
							onChange={setConditions}
						/>
					</div>
				</div>

				<DialogFooter>
					<Button variant="outline" onClick={() => onOpenChange(false)}>
						<Trans>Cancel</Trans>
					</Button>
					<Button onClick={handleSubmit}>
						{isEditing ? (
							<Trans>Save Changes</Trans>
						) : (
							<Trans>Create Rule</Trans>
						)}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
