import { Trans } from "@lingui/react/macro";
import { PiX as X } from "react-icons/pi";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";

export interface RuleCondition {
	field: "mimeType" | "extension" | "size" | "name";
	operator: string;
	value: string | number | string[];
}

const FIELD_OPTIONS = [
	{ value: "extension", label: "File Extension" },
	{ value: "mimeType", label: "MIME Type" },
	{ value: "name", label: "File Name" },
	{ value: "size", label: "File Size (bytes)" },
] as const;

const STRING_OPERATORS = [
	{ value: "equals", label: "equals" },
	{ value: "notEquals", label: "not equals" },
	{ value: "contains", label: "contains" },
	{ value: "startsWith", label: "starts with" },
	{ value: "endsWith", label: "ends with" },
	{ value: "in", label: "in (comma-separated)" },
] as const;

const NUMERIC_OPERATORS = [
	{ value: "equals", label: "equals" },
	{ value: "notEquals", label: "not equals" },
	{ value: "greaterThan", label: "greater than" },
	{ value: "lessThan", label: "less than" },
	{ value: "greaterThanOrEqual", label: "≥" },
	{ value: "lessThanOrEqual", label: "≤" },
] as const;

function getOperatorsForField(field: string) {
	return field === "size" ? NUMERIC_OPERATORS : STRING_OPERATORS;
}

interface ConditionEditorProps {
	condition: RuleCondition;
	onChange: (condition: RuleCondition) => void;
	onRemove: () => void;
	canRemove: boolean;
}

export function ConditionEditor({
	condition,
	onChange,
	onRemove,
	canRemove,
}: ConditionEditorProps) {
	const operators = getOperatorsForField(condition.field);

	const handleFieldChange = (field: string) => {
		const newField = field as RuleCondition["field"];
		const newOperators = getOperatorsForField(newField);
		const operatorValid = newOperators.some(
			(op) => op.value === condition.operator,
		);
		onChange({
			...condition,
			field: newField,
			operator: operatorValid ? condition.operator : "equals",
			value: newField === "size" ? 0 : "",
		});
	};

	return (
		<div className="flex items-center gap-2">
			<Select value={condition.field} onValueChange={handleFieldChange}>
				<SelectTrigger className="w-40">
					<SelectValue />
				</SelectTrigger>
				<SelectContent>
					{FIELD_OPTIONS.map((opt) => (
						<SelectItem key={opt.value} value={opt.value}>
							{opt.label}
						</SelectItem>
					))}
				</SelectContent>
			</Select>

			<Select
				value={condition.operator}
				onValueChange={(op) => onChange({ ...condition, operator: op })}
			>
				<SelectTrigger className="w-44">
					<SelectValue />
				</SelectTrigger>
				<SelectContent>
					{operators.map((op) => (
						<SelectItem key={op.value} value={op.value}>
							{op.label}
						</SelectItem>
					))}
				</SelectContent>
			</Select>

			<Input
				type={condition.field === "size" ? "number" : "text"}
				value={String(condition.value)}
				onChange={(e) =>
					onChange({
						...condition,
						value:
							condition.field === "size"
								? Number(e.target.value)
								: e.target.value,
					})
				}
				placeholder={
					condition.field === "extension"
						? "pdf"
						: condition.field === "mimeType"
							? "application/pdf"
							: condition.field === "size"
								? "10485760"
								: "filename"
				}
				className="flex-1"
			/>

			<Button
				type="button"
				variant="ghost"
				size="icon"
				onClick={onRemove}
				disabled={!canRemove}
				className="shrink-0"
			>
				<X className="h-4 w-4" />
				<span className="sr-only">
					<Trans>Remove condition</Trans>
				</span>
			</Button>
		</div>
	);
}
