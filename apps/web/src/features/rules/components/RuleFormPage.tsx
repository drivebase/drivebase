import { Trans } from "@lingui/react/macro";
import { ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useCreateFileRule } from "../hooks/useRules";
import { RuleForm, type RuleFormValues } from "./RuleForm";

interface RuleFormPageProps {
	onSuccess: () => void;
	onCancel: () => void;
}

export function RuleFormPage({ onSuccess, onCancel }: RuleFormPageProps) {
	const [, createRule] = useCreateFileRule();

	const handleSubmit = async (values: RuleFormValues) => {
		const result = await createRule({
			input: {
				...values,
				enabled: true,
			},
		});

		if (result.error) {
			toast.error(result.error.message);
			return;
		}

		toast.success("Rule created");
		onSuccess();
	};

	return (
		<div className="space-y-6">
			<div className="flex items-center gap-3">
				<Button variant="outline" size="icon" onClick={onCancel}>
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

			<RuleForm
				onSubmit={handleSubmit}
				onCancel={onCancel}
				submitLabel={<Trans>Create Rule</Trans>}
			/>
		</div>
	);
}
