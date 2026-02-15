"use client";

import { cva, type VariantProps } from "class-variance-authority";
import type * as React from "react";
import { cn } from "@/shared/lib/utils";

const labelVariants = cva(
	"text-sm leading-none text-foreground peer-disabled:cursor-not-allowed peer-disabled:opacity-50",
	{
		variants: {
			variant: {
				primary: "font-medium",
				secondary: "font-normal",
			},
		},
		defaultVariants: {
			variant: "primary",
		},
	},
);

function Label({
	className,
	variant,
	...props
}: React.ComponentProps<"label"> & VariantProps<typeof labelVariants>) {
	return (
		// biome-ignore lint/a11y/noLabelWithoutControl: This is a generic label component, htmlFor is passed via props.
		<label
			data-slot="label"
			className={cn(labelVariants({ variant }), className)}
			{...props}
		/>
	);
}

export { Label };
