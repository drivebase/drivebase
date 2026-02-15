import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";

type PromptState = {
	open: boolean;
	title: string;
	description: string;
	defaultValue: string;
	placeholder: string;
	submitLabel: string;
	resolve: ((value: string | null) => void) | null;
};

const initialState: PromptState = {
	open: false,
	title: "",
	description: "",
	defaultValue: "",
	placeholder: "",
	submitLabel: "Submit",
	resolve: null,
};

let openPromptDialog:
	| ((
			options: Omit<PromptState, "open" | "resolve">,
			resolve: (value: string | null) => void,
	  ) => void)
	| null = null;

export function promptDialog(
	title: string,
	description: string,
	options?: {
		defaultValue?: string;
		placeholder?: string;
		submitLabel?: string;
	},
): Promise<string | null> {
	return new Promise((resolve) => {
		if (!openPromptDialog) {
			resolve(null);
			return;
		}
		openPromptDialog(
			{
				title,
				description,
				defaultValue: options?.defaultValue ?? "",
				placeholder: options?.placeholder ?? "",
				submitLabel: options?.submitLabel ?? "Submit",
			},
			resolve,
		);
	});
}

export function PromptDialogHost() {
	const [state, setState] = useState<PromptState>(initialState);
	const [value, setValue] = useState("");
	const inputRef = useRef<HTMLInputElement>(null);

	useEffect(() => {
		openPromptDialog = (options, resolve) => {
			setState({ ...options, open: true, resolve });
			setValue(options.defaultValue);
		};
		return () => {
			openPromptDialog = null;
		};
	}, []);

	// Auto-select input text when dialog opens
	useEffect(() => {
		if (state.open) {
			requestAnimationFrame(() => {
				inputRef.current?.select();
			});
		}
	}, [state.open]);

	const close = (result: string | null) => {
		const resolver = state.resolve;
		setState((prev) => ({ ...prev, open: false, resolve: null }));
		resolver?.(result);
	};

	const handleSubmit = (e: React.FormEvent) => {
		e.preventDefault();
		const trimmed = value.trim();
		if (trimmed) {
			close(trimmed);
		}
	};

	return (
		<Dialog open={state.open} onOpenChange={(open) => !open && close(null)}>
			<DialogContent showCloseButton={false}>
				<form onSubmit={handleSubmit}>
					<DialogHeader>
						<DialogTitle>{state.title}</DialogTitle>
						{state.description ? (
							<DialogDescription>{state.description}</DialogDescription>
						) : null}
					</DialogHeader>
					<div className="py-4">
						<Input
							ref={inputRef}
							value={value}
							onChange={(e) => setValue(e.target.value)}
							placeholder={state.placeholder}
							autoFocus
						/>
					</div>
					<DialogFooter>
						<Button type="button" variant="outline" onClick={() => close(null)}>
							Cancel
						</Button>
						<Button type="submit" disabled={!value.trim()}>
							{state.submitLabel}
						</Button>
					</DialogFooter>
				</form>
			</DialogContent>
		</Dialog>
	);
}
