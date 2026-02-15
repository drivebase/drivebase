import { RiRadioButtonFill } from "@remixicon/react";
import { RadioGroup as RadioGroupPrimitive } from "radix-ui";
import type * as React from "react";
import { cn } from "@/shared/lib/utils";

function RadioGroup({
	className,
	...props
}: React.ComponentProps<typeof RadioGroupPrimitive.Root>) {
	return (
		<RadioGroupPrimitive.Root
			data-slot="radio-group"
			className={cn("grid gap-3", className)}
			{...props}
		/>
	);
}

function RadioGroupItem({
	className,
	children,
	...props
}: React.ComponentProps<typeof RadioGroupPrimitive.Item>) {
	return (
		<RadioGroupPrimitive.Item
			data-slot="radio-group-item"
			className={cn(
				"border-input ring-ring/10 dark:ring-ring/20 dark:outline-ring/40 outline-ring/50 text-primary aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive aspect-square size-4 shrink-0 rounded-full border shadow-xs transition-[color,box-shadow] focus-visible:ring-4 focus-visible:outline-1 disabled:cursor-not-allowed disabled:opacity-50",
				className,
			)}
			{...props}
		>
			<RadioGroupPrimitive.Indicator
				data-slot="radio-group-indicator"
				className="relative flex items-center justify-center"
			>
				<RiRadioButtonFill className="fill-primary size-3.5" />
			</RadioGroupPrimitive.Indicator>
			{children}
		</RadioGroupPrimitive.Item>
	);
}

export { RadioGroup, RadioGroupItem };
