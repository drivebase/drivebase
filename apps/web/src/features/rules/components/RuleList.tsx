import { Trans } from "@lingui/react/macro";
import { useNavigate } from "@tanstack/react-router";
import { useCallback } from "react";
import {
	PiArrowDown as ArrowDown,
	PiArrowUp as ArrowUp,
	PiPencilSimple as Pencil,
	PiPlus as Plus,
	PiTrash as Trash2,
} from "react-icons/pi";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import type { GetFileRulesQuery } from "@/gql/graphql";
import { confirmDialog } from "@/shared/lib/confirmDialog";
import {
	useDeleteFileRule,
	useFileRules,
	useReorderFileRules,
} from "../hooks/useRules";

type FileRule = GetFileRulesQuery["fileRules"][number];

function conditionSummary(conditions: FileRule["conditions"]): string {
	const groups = (
		conditions as {
			groups: Array<{
				conditions: Array<{ field: string; operator: string; value: unknown }>;
			}>;
		}
	).groups;
	if (!groups || groups.length === 0) return "No conditions";

	return groups
		.map((g) =>
			g.conditions
				.map((c) => `${c.field} ${c.operator} ${String(c.value)}`)
				.join(" AND "),
		)
		.join(" OR ");
}

export function RuleList() {
	const [rulesResult, reexecuteRules] = useFileRules();
	const [, deleteRule] = useDeleteFileRule();
	const [, reorderRules] = useReorderFileRules();
	const navigate = useNavigate();

	const rules = rulesResult.data?.fileRules ?? [];

	const handleCreate = () => {
		navigate({ to: "/settings/rules/new" });
	};

	const handleEdit = (rule: FileRule) => {
		navigate({ to: "/settings/rules/$ruleId", params: { ruleId: rule.id } });
	};

	const handleDelete = async (rule: FileRule) => {
		const confirmed = await confirmDialog(
			"Delete Rule",
			`Are you sure you want to delete "${rule.name}"?`,
		);
		if (!confirmed) return;

		const result = await deleteRule({ id: rule.id });
		if (result.error) {
			toast.error(result.error.message);
			return;
		}
		toast.success("Rule deleted");
		reexecuteRules({ requestPolicy: "network-only" });
	};

	const handleMove = useCallback(
		async (index: number, direction: "up" | "down") => {
			const newRules = [...rules];
			const swapIndex = direction === "up" ? index - 1 : index + 1;
			if (swapIndex < 0 || swapIndex >= newRules.length) return;

			const temp = newRules[index];
			const swap = newRules[swapIndex];
			if (!temp || !swap) return;
			newRules[index] = swap;
			newRules[swapIndex] = temp;

			const orderedIds = newRules.map((r) => r.id);
			const result = await reorderRules({ orderedIds });
			if (result.error) {
				toast.error(result.error.message);
			}
			reexecuteRules({ requestPolicy: "network-only" });
		},
		[rules, reorderRules, reexecuteRules],
	);

	return (
		<div>
			<div className="flex items-center justify-between mb-4">
				<div>
					<h3 className="text-lg font-medium">
						<Trans>Rules</Trans>
					</h3>
					<p className="text-sm text-muted-foreground">
						<Trans>
							Automatically route uploaded files to specific providers and
							folders based on file attributes.
						</Trans>
					</p>
				</div>
				<Button onClick={handleCreate} size="sm">
					<Plus className="mr-1 h-4 w-4" />
					<Trans>Add Rule</Trans>
				</Button>
			</div>

			{rules.length === 0 ? (
				<div className=" border border-dashed p-8 text-center text-muted-foreground">
					<Trans>
						No rules yet. Create a rule to automatically route files on upload.
					</Trans>
				</div>
			) : (
				<div className=" border">
					<Table>
						<TableHeader>
							<TableRow>
								<TableHead className="w-20">
									<Trans>Order</Trans>
								</TableHead>
								<TableHead>
									<Trans>Name</Trans>
								</TableHead>
								<TableHead>
									<Trans>Conditions</Trans>
								</TableHead>
								<TableHead>
									<Trans>Destination</Trans>
								</TableHead>
								<TableHead className="w-24 text-right">
									<Trans>Actions</Trans>
								</TableHead>
							</TableRow>
						</TableHeader>
						<TableBody>
							{rules.map((rule, index) => (
								<TableRow key={rule.id}>
									<TableCell>
										<div className="flex flex-col gap-0.5">
											<Button
												variant="ghost"
												size="icon"
												className="h-5 w-5"
												disabled={index === 0}
												onClick={() => handleMove(index, "up")}
											>
												<ArrowUp className="h-3 w-3" />
											</Button>
											<Button
												variant="ghost"
												size="icon"
												className="h-5 w-5"
												disabled={index === rules.length - 1}
												onClick={() => handleMove(index, "down")}
											>
												<ArrowDown className="h-3 w-3" />
											</Button>
										</div>
									</TableCell>
									<TableCell className="font-medium">{rule.name}</TableCell>
									<TableCell>
										<span className="text-xs text-muted-foreground truncate max-w-60 block">
											{conditionSummary(rule.conditions)}
										</span>
									</TableCell>
									<TableCell>
										<div className="flex items-center gap-1.5">
											<Badge variant="secondary">
												{rule.destinationProvider.name}
											</Badge>
											{rule.destinationFolder && (
												<span className="text-xs text-muted-foreground">
													{rule.destinationFolder.virtualPath}
												</span>
											)}
										</div>
									</TableCell>
									<TableCell className="text-right">
										<div className="flex justify-end gap-1">
											<Button
												variant="ghost"
												size="icon"
												className="h-7 w-7"
												onClick={() => handleEdit(rule)}
											>
												<Pencil className="h-3.5 w-3.5" />
											</Button>
											<Button
												variant="ghost"
												size="icon"
												className="h-7 w-7 text-destructive"
												onClick={() => handleDelete(rule)}
											>
												<Trash2 className="h-3.5 w-3.5" />
											</Button>
										</div>
									</TableCell>
								</TableRow>
							))}
						</TableBody>
					</Table>
				</div>
			)}
		</div>
	);
}
