import { Trans } from "@lingui/react/macro";
import { useCallback, useState } from "react";
import { toast } from "sonner";
import { useQuery } from "urql";
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
import { PROVIDERS_QUERY } from "@/features/providers/api/provider";
import { RULE_FOLDERS_QUERY } from "../api/rule";
import {
	ConditionGroupEditor,
	type RuleConditionGroups,
} from "./ConditionGroupEditor";

export const DEFAULT_RULE_CONDITIONS: RuleConditionGroups = {
	groups: [
		{
			conditions: [{ field: "extension", operator: "equals", value: "" }],
		},
	],
};

export interface RuleFormValues {
	name: string;
	enabled: boolean;
	destinationProviderId: string;
	destinationFolderId: string | null;
	conditions: RuleConditionGroups;
}

export interface RuleFormProps {
	initialValues?: Partial<RuleFormValues>;
	submitLabel?: React.ReactNode;
	onSubmit: (values: RuleFormValues) => Promise<void>;
	onCancel: () => void;
}

export function RuleForm({
	initialValues,
	submitLabel,
	onSubmit,
	onCancel,
}: RuleFormProps) {
	const [name, setName] = useState(initialValues?.name ?? "");
	const [enabled, setEnabled] = useState(initialValues?.enabled ?? true);
	const [destinationProviderId, setDestinationProviderId] = useState(
		initialValues?.destinationProviderId ?? "",
	);
	const [destinationFolderId, setDestinationFolderId] = useState<string | null>(
		initialValues?.destinationFolderId ?? null,
	);
	const [conditions, setConditions] = useState<RuleConditionGroups>(
		initialValues?.conditions ?? DEFAULT_RULE_CONDITIONS,
	);

	const [providersResult] = useQuery({ query: PROVIDERS_QUERY });
	const [foldersResult] = useQuery({
		query: RULE_FOLDERS_QUERY,
		pause: !destinationProviderId,
	});

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

		await onSubmit({
			name,
			enabled,
			destinationProviderId,
			destinationFolderId,
			conditions,
		});
	}, [
		name,
		enabled,
		destinationProviderId,
		destinationFolderId,
		conditions,
		onSubmit,
	]);

	return (
		<div className="space-y-4 max-w-2xl">
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
				<Checkbox
					checked={enabled}
					onCheckedChange={(checked) =>
						setEnabled(checked === "indeterminate" ? false : checked)
					}
				/>
				<Label>
					<Trans>Enabled</Trans>
				</Label>
			</div>

			<div className="space-y-2 w-64">
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

			<div className="space-y-2 w-64">
				<Label>
					<Trans>Destination Folder (optional)</Trans>
				</Label>
				<Select
					value={destinationFolderId ?? "__none__"}
					onValueChange={(v) =>
						setDestinationFolderId(v === "__none__" ? null : v)
					}
					disabled={!destinationProviderId}
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
						Files matching these conditions will be routed to the destination.
						Groups are combined with OR; conditions within a group are combined
						with AND.
					</Trans>
				</p>
				<ConditionGroupEditor
					conditionGroups={conditions}
					onChange={setConditions}
				/>
			</div>

			<div className="flex gap-2 pt-2">
				<Button onClick={handleSubmit}>
					{submitLabel ?? <Trans>Save</Trans>}
				</Button>
				<Button variant="outline" onClick={onCancel}>
					<Trans>Cancel</Trans>
				</Button>
			</div>
		</div>
	);
}
