import { Trans } from "@lingui/react/macro";
import { ArrowLeft } from "lucide-react";
import { useCallback, useState } from "react";
import { toast } from "sonner";
import { useQuery } from "urql";
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
import { PROVIDERS_QUERY } from "@/features/providers/api/provider";
import { RULE_FOLDERS_QUERY } from "../api/rule";
import { useCreateFileRule } from "../hooks/useRules";
import {
	ConditionGroupEditor,
	type RuleConditionGroups,
} from "./ConditionGroupEditor";

interface RuleFormPageProps {
	onSuccess: () => void;
	onCancel: () => void;
}

const DEFAULT_CONDITIONS: RuleConditionGroups = {
	groups: [
		{
			conditions: [{ field: "extension", operator: "equals", value: "" }],
		},
	],
};

export function RuleFormPage({ onSuccess, onCancel }: RuleFormPageProps) {
	const [name, setName] = useState("");
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

		const result = await createRule({
			input: {
				name,
				enabled: true,
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
		onSuccess();
	}, [
		name,
		conditions,
		destinationProviderId,
		destinationFolderId,
		createRule,
		onSuccess,
	]);

	return (
		<div className="space-y-6">
			<div className="flex items-center gap-3">
				<Button variant="ghost" size="icon" onClick={onCancel}>
					<ArrowLeft className="h-4 w-4" />
				</Button>
				<div>
					<h2 className="text-xl font-semibold">
						<Trans>Create Rule</Trans>
					</h2>
					<p className="text-sm text-muted-foreground">
						<Trans>
							Automatically route uploaded files based on conditions.
						</Trans>
					</p>
				</div>
			</div>

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

				<div className="grid grid-cols-2 gap-4">
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
							<SelectTrigger className="w-full">
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
							<SelectTrigger className="w-full">
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
				</div>

				<div className="space-y-2">
					<Label>
						<Trans>Conditions</Trans>
					</Label>
					<p className="text-xs text-muted-foreground">
						<Trans>
							Files matching these conditions will be routed to the destination.
							Groups are combined with OR; conditions within a group are
							combined with AND.
						</Trans>
					</p>
					<ConditionGroupEditor
						conditionGroups={conditions}
						onChange={setConditions}
					/>
				</div>

				<div className="flex gap-2 pt-2">
					<Button variant="outline" onClick={onCancel}>
						<Trans>Cancel</Trans>
					</Button>
					<Button onClick={handleSubmit}>
						<Trans>Create Rule</Trans>
					</Button>
				</div>
			</div>
		</div>
	);
}
